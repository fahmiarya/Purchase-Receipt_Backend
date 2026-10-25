
const { PrismaClient } = require('@prisma/client');

module.exports = async function (fastify, opts) {
 
  const prisma = new PrismaClient();
  fastify.decorate('prisma', prisma);

  
  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
};
