// src/routes/purchaseOrder.js
/**
 * Purchase Order (PO) routes – header and items.
 */
module.exports = async function (fastify) {
  const prisma = fastify.prisma;

  const poSchema = {
    type: 'object',
    required: ['noPO', 'vendorId', 'tglPO'],
    properties: {
      noPO: { type: 'string' },
      noPR: { type: ['string', 'null'] },
      vendorId: { type: 'integer' },
      tglPO: { type: 'string', format: 'date-time' },
      status: { type: 'string', enum: ['open', 'partial', 'complete', 'cancelled'] },
      notes: { type: ['string', 'null'] },
    },
    additionalProperties: false,
  };

  // List all POs
  fastify.get('/purchase-orders', async () => {
    return prisma.purchaseOrder.findMany({ include: { vendor: true } });
  });

  // Get single PO with items
  fastify.get('/purchase-orders/:id', async (req, reply) => {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: Number(req.params.id) },
      include: { vendor: true, items: { include: { item: true } } },
    });
    return po ? po : reply.code(404).send({ error: 'PurchaseOrder not found' });
  });

  // Create PO (items can be added later)
  fastify.post('/purchase-orders', { schema: { body: poSchema } }, async (req, reply) => {
    const created = await prisma.purchaseOrder.create({ data: req.body });
    return reply.code(201).send(created);
  });

  // Update PO
  fastify.put('/purchase-orders/:id', { schema: { body: poSchema } }, async (req, reply) => {
    const id = Number(req.params.id);
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: req.body,
    });
    return updated;
  });

  // Delete PO
  fastify.delete('/purchase-orders/:id', async (req, reply) => {
    await prisma.purchaseOrder.delete({ where: { id: Number(req.params.id) } });
    return reply.code(204).send();
  });

  // ---- PO Items ----
  const poItemSchema = {
    type: 'object',
    required: ['itemId', 'qtyPO', 'hargaPO'],
    properties: {
      itemId: { type: 'integer' },
      qtyPO: { type: 'number' },
      hargaPO: { type: 'number' },
    },
    additionalProperties: false,
  };

  // Add PO item
  fastify.post(
    '/purchase-orders/:id/items',
    { schema: { body: poItemSchema } },
    async (req, reply) => {
      const poId = Number(req.params.id);
      const data = { ...req.body, poId };
      const created = await prisma.purchaseOrderItem.create({ data });
      return reply.code(201).send(created);
    },
  );

  // List PO items
  fastify.get('/purchase-orders/:id/items', async (req, reply) => {
    const items = await prisma.purchaseOrderItem.findMany({
      where: { poId: Number(req.params.id) },
      include: { item: true },
    });
    return items;
  });
};
