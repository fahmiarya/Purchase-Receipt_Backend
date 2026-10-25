// src/routes/goodsReceipt.js
/**
 * Goods Receipt (GR) routes – header and items.
 */
module.exports = async function (fastify) {
  const prisma = fastify.prisma;

  const grSchema = {
    type: 'object',
    required: ['noGR', 'poId', 'tglGR'],
    properties: {
      noGR: { type: 'string' },
      poId: { type: 'integer' },
      tglGR: { type: 'string', format: 'date-time' },
      notes: { type: ['string', 'null'] },
    },
    additionalProperties: false,
  };

  // List all Goods Receipts
  fastify.get('/goods-receipts', async () => {
    return prisma.goodsReceipt.findMany({ include: { po: true } });
  });

  // Get single GR with items
  fastify.get('/goods-receipts/:id', async (req, reply) => {
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id: Number(req.params.id) },
      include: { po: true, items: { include: { item: true, poItem: true } } },
    });
    return gr ? gr : reply.code(404).send({ error: 'GoodsReceipt not found' });
  });

  // Create GR (items added later)
  fastify.post('/goods-receipts', { schema: { body: grSchema } }, async (req, reply) => {
    const created = await prisma.goodsReceipt.create({ data: req.body });
    return reply.code(201).send(created);
  });

  // Update GR
  fastify.put('/goods-receipts/:id', { schema: { body: grSchema } }, async (req, reply) => {
    const id = Number(req.params.id);
    const updated = await prisma.goodsReceipt.update({ where: { id }, data: req.body });
    return updated;
  });

  // Delete GR
  fastify.delete('/goods-receipts/:id', async (req, reply) => {
    await prisma.goodsReceipt.delete({ where: { id: Number(req.params.id) } });
    return reply.code(204).send();
  });

  // ---- GR Items ----
  const grItemSchema = {
    type: 'object',
    required: ['poItemId', 'itemId', 'qtyDiterima'],
    properties: {
      poItemId: { type: 'integer' },
      itemId: { type: 'integer' },
      qtyDiterima: { type: 'number' },
    },
    additionalProperties: false,
  };

  // Add GR item
  fastify.post(
    '/goods-receipts/:id/items',
    { schema: { body: grItemSchema } },
    async (req, reply) => {
      const grId = Number(req.params.id);
      const data = { ...req.body, grId };
      const created = await prisma.goodsReceiptItem.create({ data });
      return reply.code(201).send(created);
    },
  );

  // List GR items
  fastify.get('/goods-receipts/:id/items', async (req, reply) => {
    const items = await prisma.goodsReceiptItem.findMany({
      where: { grId: Number(req.params.id) },
      include: { item: true, poItem: true },
    });
    return items;
  });
};
