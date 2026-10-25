

module.exports = async function (fastify) {
  const { poSchema, poUpdateSchema, poItemSchema } = require('../schemas/po.schema');
  const poHandler = require('../handlers/po.handler');

  // List PO (filters & pagination)
  fastify.get('/purchase-orders', poHandler.listPO);

  // Get PO detail
  fastify.get('/purchase-orders/:id', poHandler.getPO);

  // Create PO
  fastify.post('/purchase-orders', { schema: { body: poSchema } }, poHandler.createPO);

  // Update PO header (only when status is open)
  fastify.put('/purchase-orders/:id', { schema: { body: poUpdateSchema } }, poHandler.updatePO);

  // Cancel PO (only open, no GR linked)
  fastify.patch('/purchase-orders/:id/cancel', poHandler.cancelPO);

  // Delete PO (only open, no GR linked)
  fastify.delete('/purchase-orders/:id', poHandler.deletePO);

  // PO Items sub‑routes
  fastify.get('/purchase-orders/:id/items', poHandler.listPOItems);
  fastify.post('/purchase-orders/:id/items', { schema: { body: poItemSchema } }, poHandler.addPOItem);
  fastify.put('/purchase-orders/:id/items/:itemId', { schema: { body: poItemSchema } }, poHandler.updatePOItem);
  fastify.delete('/purchase-orders/:id/items/:itemId', poHandler.deletePOItem);

  // Receipt status endpoint
  fastify.get('/purchase-orders/:id/receipt-status', poHandler.receiptStatus);
};
