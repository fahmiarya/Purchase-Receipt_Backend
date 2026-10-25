// src/server.js
require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Make Prisma available to routes
fastify.decorate('prisma', prisma);

// Health check endpoint
fastify.get('/health', async (request, reply) => ({ status: 'ok' }));

// Global response wrapper – ensures all successful responses follow the spec
fastify.addHook('onSend', async (request, reply, payload) => {
  // If payload is already a string (JSON) try to parse it
  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return payload; // not JSON, send as‑is
  }
  // If it's already in the spec format (has success flag), leave it untouched
  if (data && typeof data === 'object' && 'success' in data) {
    return payload;
  }
  // Wrap the payload
  const wrapped = {
    success: true,
    data,
    message: '',
  };
  return JSON.stringify(wrapped);
});

// Register route plugins with API version prefix
fastify.register(require('./routes/item'), { prefix: '/api/v1' });
fastify.register(require('./routes/vendor'), { prefix: '/api/v1' });
fastify.register(require('./routes/purchaseOrder'), { prefix: '/api/v1' });
fastify.register(require('./routes/goodsReceipt'), { prefix: '/api/v1' });
fastify.register(require('./routes/itemCategory'), { prefix: '/api/v1' });


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
