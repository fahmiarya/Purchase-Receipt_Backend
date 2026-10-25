
const { success, ok, created, errorResponse, noContent } = require('../utils/response');
const poService = require('../services/po.service');

module.exports = {
  // ---------------------------------------------------------------------
  // List PO (filters & pagination)
  async listPO(request, reply) {
    try {
      const result = await poService.listPO(request.server.prisma, request.query);
      return reply.send(success(result, 'List purchase orders'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  // ---------------------------------------------------------------------
  // Get PO detail
  async getPO(request, reply) {
    try {
      const id = Number(request.params.id);
      const result = await poService.getPO(request.server.prisma, id);
      return reply.send(success(result, 'Purchase order detail'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  // ---------------------------------------------------------------------
  // Create PO
  async createPO(request, reply) {
    try {
      const result = await poService.createPO(request.server.prisma, request.body);
      return reply.code(201).send(created(result, 'Purchase order created'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  // ---------------------------------------------------------------------
  // Update PO header (only when status is open)
  async updatePO(request, reply) {
    try {
      const id = Number(request.params.id);
      const result = await poService.updatePO(request.server.prisma, id, request.body);
      return reply.send(ok(result, 'Purchase order updated'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  // ---------------------------------------------------------------------
  // Cancel PO (only open, no GR linked)
  async cancelPO(request, reply) {
     try {
        const id = Number(request.params.id);
        const result = await poService.cancelPO(request.server.prisma, id);
        return reply.send(ok(result, 'PO cancelled'));
      } catch (err) {
        return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
      }
  },


  async deletePO(request, reply) {
    try {
      const id = Number(request.params.id);
      await poService.deletePO(request.server.prisma, id);
      return reply.code(204).send(noContent());
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  // ---------------------------------------------------------------------
  // PO Items sub‑routes
  async listPOItems(request, reply) {
    try {
      const poId = Number(request.params.id);
      const result = await poService.listPOItems(request.server.prisma, poId);
      return reply.send(success(result, 'PO items'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async addPOItem(request, reply) {
    try {
      const poId = Number(request.params.id);
      const result = await poService.addPOItem(request.server.prisma, poId, request.body);
      return reply.code(201).send(created(result, 'PO item added'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async updatePOItem(request, reply) {
    try {
      const poId = Number(request.params.id);
      const itemId = request.params.itemId; 
      const result = await poService.updatePOItem(request.server.prisma, poId, itemId, request.body);
      return reply.send(ok(result, 'PO item updated'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },

  async deletePOItem(request, reply) {
    try {
      const poId = Number(request.params.id);
      const itemId = request.params.itemId;
      await poService.deletePOItem(request.server.prisma, poId, itemId);
      return reply.code(204).send(noContent());
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },


  async receiptStatus(request, reply) {
    try {
      const poId = Number(request.params.id);
      const result = await poService.receiptStatus(request.server.prisma, poId);
      return reply.send(success(result, 'Receipt status'));
    } catch (err) {
      return reply.code(err.statusCode ?? 500).send(errorResponse(err.message, err.details));
    }
  },
};
