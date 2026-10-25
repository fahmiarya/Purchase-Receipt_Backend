// src/routes/itemCategory.js
/**
 * Item Category routes – expose master hierarchy.
 * Returns list of categories with optional parent information.
 */
module.exports = async function (fastify) {
  const prisma = fastify.prisma;

  // List all categories (ordered by code)
  fastify.get('/item-categories', async (req, reply) => {
    const categories = await prisma.itemCategory.findMany({
      orderBy: { code: 'asc' },
    });
    return categories;
  });
};
