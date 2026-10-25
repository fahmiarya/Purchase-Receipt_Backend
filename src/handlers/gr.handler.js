// src/handlers/gr.handler.js
// Fastify request handlers for Goods Receipt (GR) endpoints.
// Delegates to gr.service.js and formats responses using utils/response.

const { success, created, errorResponse } = require('../utils/response');
const grService = require('../services/gr.service');

module.exports = {
  // List Goods Receipts
  async listGR(prisma, query) {
    // This function is used directly in route file (invoked with prisma, query)
    return await grService.listGR(prisma, query);
  },

  // Get single GR detail
  async getGR(prisma, id) {
    return await grService.getGR(prisma, id);
  },

  // Create Goods Receipt
  async createGR(prisma, data) {
    return await grService.createGR(prisma, data);
  },
};
