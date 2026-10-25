
module.exports = async function (fastify) {
  const { success, created, errorResponse } = require('../utils/response');
  const grHandler = require('../handlers/gr.handler');
  const grSchema = require('../schemas/gr.schema');


  fastify.get('/goods-receipts', async (req, reply) => {
    try {
      const data = await grHandler.listGR(fastify.prisma, req.query);
      return reply.send(success(data, 'List goods receipts'));
    } catch (err) {
      const { statusCode = 500, message } = err;
      return reply.code(statusCode).send(errorResponse(message));
    }
  });


  fastify.get('/goods-receipts/:id', async (req, reply) => {
    try {
      const data = await grHandler.getGR(fastify.prisma, Number(req.params.id));
      return reply.send(success(data, 'Goods receipt detail'));
    } catch (err) {
      const { statusCode = 500, message } = err;
      return reply.code(statusCode).send(errorResponse(message));
    }
  });

 
  fastify.post(
    '/goods-receipts',
    { schema: { body: grSchema.create } },
    async (req, reply) => {
      try {
        const data = await grHandler.createGR(fastify.prisma, req.body);
        return reply.code(201).send(created(data, 'Goods receipt created'));
      } catch (err) {
        const { statusCode = 500, message, details } = err;
        const resp = errorResponse(message, details);
        return reply.code(statusCode).send(resp);
      }
    }
  );
};
