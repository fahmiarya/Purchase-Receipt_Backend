// src/services/item.service.js
// Service layer for Item master data, including auto‑generation of the `code`
// according to the rule: the last segment (sequence) increments when the
// preceding parts (category, brand) are identical.

module.exports = {
  async listItems(prisma, query) {
    const where = {};
    if (query?.category_code) where.itemCategoryCode = query.category_code;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search } },
        { name: { contains: query.search } },
      ];
    }
    const items = await prisma.item.findMany({ where, skip: query?.skip, take: query?.take });
    return items;
  },

  async getItem(prisma, id) {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) throw { statusCode: 404, message: 'Item not found' };
    return item;
  },

  async getItemStock(prisma, id) {
    const item = await prisma.item.findUnique({ where: { id }, select: { stock: true } });
    if (!item) throw { statusCode: 404, message: 'Item not found' };
    return { stock: item.stock };
  },

  // Create item – `code` is generated automatically.
  async createItem(prisma, payload) {
    const { name, itemCategoryCode, brandCode = '000', uom, stock = 0 } = payload;

    // Determine the next sequence for the given category/brand combination
    const last = await prisma.item.findFirst({
      where: { itemCategoryCode, brandCode },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    const nextSeq = (last?.sequence ?? 0) + 1;

    // Build the code. For simplicity we use the category code as the first three
    // segments (L1‑L3) and append brand + padded sequence.
    const code = `${itemCategoryCode}-${brandCode}-${String(nextSeq).padStart(3, '0')}`;

    let uniqueCode = code;
    let seq = nextSeq;
    // Ensure generated code is unique; increment sequence if needed
    while (await prisma.item.findUnique({ where: { code: uniqueCode } })) {
      seq += 1;
      uniqueCode = `${itemCategoryCode}-${brandCode}-${String(seq).padStart(3, '0')}`;
    }
    // Ensure the referenced ItemCategory exists (create a placeholder if needed)
    await prisma.itemCategory.upsert({
      where: { code: itemCategoryCode },
      create: { code: itemCategoryCode, name: itemCategoryCode },
      update: {},
    });

const created = await prisma.item.create({
  data: {
    code: uniqueCode,
    name,
    itemCategoryCode,
    brandCode,
    sequence: seq,
    uom,
    stock,
  },
});
    return created;
  },

  async updateItem(prisma, id, payload) {
    const updated = await prisma.item.update({ where: { id }, data: payload });
    return updated;
  },

  async deleteItem(prisma, id) {
    // Prevent deletion if the item is referenced in PO or GR items
    const related = await prisma.purchaseOrderItem.findFirst({ where: { itemId: id } })
      .then(res => !!res);
    if (related) throw { statusCode: 422, message: 'Item is used in purchase orders and cannot be deleted' };
    await prisma.item.delete({ where: { id } });
  },
};
