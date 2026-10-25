// src/server.js
require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Make Prisma available to routes
fastify.decorate('prisma', prisma);

// Health check endpoint
fastify.get('/health', async (request, reply) => ({ status: 'ok' }));

// Register route plugins
fastify.register(require('./routes/item'));
fastify.register(require('./routes/vendor'));
fastify.register(require('./routes/purchaseOrder'));
fastify.register(require('./routes/goodsReceipt'));

const start = async () => {
  try {
    await fastify.listen({ port: process.env.APP_PORT || 8080, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
