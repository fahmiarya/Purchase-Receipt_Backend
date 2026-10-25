
module.exports = async function (fastify) {
  const { listItemSchema, createItemSchema, updateItemSchema } = require('../schemas/item.schema');
  const itemHandler = require('../handlers/item.handler');

  fastify.get('/items', { schema: { querystring: listItemSchema } }, itemHandler.listItems);
  fastify.get('/items/:id', itemHandler.getItem);
  fastify.get('/items/:id/stock', itemHandler.getItemStock);
  fastify.post('/items', { schema: { body: createItemSchema } }, itemHandler.createItem);
  fastify.put('/items/:id', { schema: { body: updateItemSchema } }, itemHandler.updateItem);
  fastify.delete('/items/:id', itemHandler.deleteItem);
};
