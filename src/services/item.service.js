// src/services/item.service.js
// Service layer for Item master data, including auto‑generation of the `code`
// according to the rule documented in REQUIREMENTS.md:
//   code = {L1}-{L2}-{L3}-{brandCode}-{sequence}   e.g. A-AA-PPR-000-001
// The sequence increments when the preceding parts (category, brand) match.

// Resolve the full hierarchy prefix for a category code, e.g. PPR → A-AA-PPR.
async function categoryPrefix(prisma, code) {
  const category = await prisma.itemCategory.findUnique({
    where: { code },
    select: { code: true, parentCode: true },
  });
  if (!category) return [code];
  if (!category.parentCode) return [category.code];
  const parentPrefix = await categoryPrefix(prisma, category.parentCode);
  return [...parentPrefix, category.code];
}

// Resolve all category codes consisting of [code] itself plus all descendants
// (any depth). Used so `?category_code=` can filter at any hierarchy level.
async function descendantCodes(prisma, code) {
  const all = [code];
  const children = await prisma.itemCategory.findMany({
    where: { parentCode: code },
    select: { code: true },
  });
  for (const child of children) {
    all.push(...(await descendantCodes(prisma, child.code)));
  }
  return all;
}

module.exports = {
  async listItems(prisma, query) {
    const where = {};
    if (query?.category_code) {
      const codes = await descendantCodes(prisma, query.category_code);
      where.itemCategoryCode = { in: codes };
    }
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

  // Create item. Client hanya mengirim { name, itemCategoryCode, brandCode, uom }.
  // `code`, `sequence`, dan `stock` di-handle otomatis oleh backend:
  //   - code     : {L1}-{L2}-{L3}-{brandCode}-{sequence}
  //   - sequence : urutan berikutnya untuk kombinasi kategori + brand yang sama
  //   - stock    : dimulai dari 0
  async createItem(prisma, payload) {
    const { name, itemCategoryCode, brandCode = '000', uom } = payload;

    // Auto-generate: sequence increments within the same category + brand.
    const last = await prisma.item.findFirst({
      where: { itemCategoryCode, brandCode },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    let nextSeq = (last?.sequence ?? 0) + 1;

    const prefix = (await categoryPrefix(prisma, itemCategoryCode)).join('-');
    let uniqueCode = `${prefix}-${brandCode}-${String(nextSeq).padStart(3, '0')}`;

    // Ensure generated code is unique; increment sequence if needed
    let seq = nextSeq;
    while (await prisma.item.findUnique({ where: { code: uniqueCode } })) {
      seq += 1;
      uniqueCode = `${prefix}-${brandCode}-${String(seq).padStart(3, '0')}`;
    }
    nextSeq = seq;

    // Ensure the referenced ItemCategory exists (create a placeholder if needed)
    await prisma.itemCategory.upsert({
      where: { code: itemCategoryCode },
      create: { code: itemCategoryCode, name: itemCategoryCode },
      update: {},
    });

    try {
      const created = await prisma.item.create({
        data: {
          code: uniqueCode,
          name,
          itemCategoryCode,
          brandCode,
          sequence: nextSeq,
          uom,
          stock: 0,
        },
      });
      return created;
    } catch (err) {
      // P2002 = unique constraint violation (code or category+brand+sequence)
      if (err?.code === 'P2002') {
        throw {
          statusCode: 422,
          message: 'Item code or (category, brand, sequence) combination already exists',
          details: err.meta,
        };
      }
      throw err;
    }
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
