
const { success, created, ok, errorResponse } = require('../utils/response');
const itemService = require('../services/item.service');

module.exports = {
  async listItems(request, reply) {
    try {
      const result = await itemService.listItems(request.server.prisma, request.query);
      return reply.send(success(result, 'List items'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async getItem(request, reply) {
    try {
      const id = Number(request.params.id);
      const result = await itemService.getItem(request.server.prisma, id);
      return reply.send(success(result, 'Item detail'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async getItemStock(request, reply) {
    try {
      const id = Number(request.params.id);
      const result = await itemService.getItemStock(request.server.prisma, id);
      return reply.send(success(result, 'Item stock'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async createItem(request, reply) {
    try {
      const result = await itemService.createItem(request.server.prisma, request.body);
      return reply.code(201).send(created(result, 'Item created'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async updateItem(request, reply) {
    try {
      const id = Number(request.params.id);
      const result = await itemService.updateItem(request.server.prisma, id, request.body);
      return reply.send(ok(result, 'Item updated'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async toggleItemStatus(request, reply) {
    try {
      const id = Number(request.params.id);
      const result = await itemService.toggleItemStatus(
        request.server.prisma, id, request.body.isActive,
      );
      return reply.send(ok(result, result.isActive ? 'Item activated' : 'Item deactivated'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },
};
