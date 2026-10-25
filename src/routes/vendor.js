// src/routes/vendor.js
/**
 * Vendor routes – basic CRUD operations.
 */
module.exports = async function (fastify) {
  const prisma = fastify.prisma;

  const vendorSchema = {
    type: 'object',
    required: ['code', 'name'],
    properties: {
      code: { type: 'string' },
      name: { type: 'string' },
      phone: { type: ['string', 'null'] },
      address: { type: ['string', 'null'] },
    },
    additionalProperties: false,
  };

  // List vendors
  fastify.get('/vendors', async () => {
    return prisma.vendor.findMany();
  });

  // Get vendor by id
  fastify.get('/vendors/:id', async (req, reply) => {
    const vendor = await prisma.vendor.findUnique({
      where: { id: Number(req.params.id) },
    });
    return vendor ? vendor : reply.code(404).send({ error: 'Vendor not found' });
  });

  // Create vendor
  fastify.post('/vendors', { schema: { body: vendorSchema } }, async (req, reply) => {
    const created = await prisma.vendor.create({ data: req.body });
    return reply.code(201).send(created);
  });

  // Update vendor
  fastify.put('/vendors/:id', { schema: { body: vendorSchema } }, async (req, reply) => {
    const id = Number(req.params.id);
    const updated = await prisma.vendor.update({
      where: { id },
      data: req.body,
    });
    return updated;
  });

  // Delete vendor
  fastify.delete('/vendors/:id', async (req, reply) => {
    await prisma.vendor.delete({ where: { id: Number(req.params.id) } });
    return reply.code(204).send();
  });
};
