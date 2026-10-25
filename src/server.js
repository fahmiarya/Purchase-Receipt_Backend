// src/server.js
require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// TODO: add routes for items, vendors, purchase orders, goods receipts

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
