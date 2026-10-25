require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

fastify.decorate("prisma", prisma);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
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
