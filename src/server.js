require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

fastify.decorate("prisma", prisma);

// CORS – allow requests from the Flutter web frontend (any localhost port).
fastify.register(cors, { origin: true });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  // Always log the failing error (incl. stack) so intermittent 500s are
  // diagnosable from docker logs.
  request.log.error({ err: error, reqId: request.id, url: request.url },
    "request failed");
  const status = error.statusCode ?? 500;
  reply.code(status).send({
    success: false,
    error: error.message || "Internal Server Error",
    details: error.validation || null,
  });
});

// Not found handler
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    success: false,
    error: `Route ${request.method}:${request.url} not found`,
    details: null,
  });
});

// Routes
fastify.register(
  async (app) => {
    app.get("/health", async () => ({ success: true, data: { status: "ok" } }));
    app.register(require("./routes/item.routes"));
    app.register(require("./routes/po.routes"));
    app.register(require("./routes/gr.routes"));
  },
  { prefix: "/api/v1" },
);

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.APP_PORT || 8080,
      host: "0.0.0.0",
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
