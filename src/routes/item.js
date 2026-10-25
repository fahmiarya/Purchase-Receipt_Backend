// src/routes/item.js
/**
 * Item routes
 * Implements basic CRUD for Item model.
 * Validation uses Fastify JSON schema.
 */
module.exports = async function (fastify) {
  const prisma = fastify.prisma;

  // JSON Schemas
  const itemSchema = {
    type: 'object',
    required: ['code', 'name', 'itemCategoryCode', 'brandCode', 'uom'],
    properties: {
      code: { type: 'string' },
      name: { type: 'string' },
      itemCategoryCode: { type: ['string', 'null'] },
      brandCode: { type: 'string', minLength: 3, maxLength: 3 },
      uom: { type: 'string', enum: ['pcs','kg','gram','m','cm','liter','ml','set','unit','lembar','batang','roll'] },
      stock: { type: 'number' },
    },
    additionalProperties: false,
  };

  // List items
  fastify.get('/items', async (req, reply) => {
    const items = await prisma.item.findMany({
      include: { itemCategory: true },
    });
    return items;
  });

  // Get single item
  fastify.get('/items/:id', async (req, reply) => {
    const item = await prisma.item.findUnique({
      where: { id: Number(req.params.id) },
      include: { itemCategory: true },
    });
    if (!item) {
      return reply.code(404).send({ error: 'Item not found' });
    }
    return item;
  });

  // Create item
  fastify.post('/items', { schema: { body: itemSchema } }, async (req, reply) => {
    const data = req.body;
    // Prisma will enforce unique code etc.
    const created = await prisma.item.create({ data });
    return reply.code(201).send(created);
  });

  // Update item
  fastify.put('/items/:id', { schema: { body: itemSchema } }, async (req, reply) => {
    const id = Number(req.params.id);
    const data = req.body;
    const updated = await prisma.item.update({
      where: { id },
      data,
    });
    return updated;
  });

  // Delete item
  fastify.delete('/items/:id', async (req, reply) => {
    const id = Number(req.params.id);
    await prisma.item.delete({ where: { id } });
    return reply.code(204).send();
  });
};
