# Multi‑stage Dockerfile for Node.js Fastify + Prisma backend
# ---------- Build stage ----------
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Install dependencies (including Prisma generation)
COPY package.json package-lock.json* ./

RUN npm config set registry https://registry.npmjs.org/
RUN npm ci --ignore-scripts

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# ---------- Runtime stage ----------
FROM node:20-bullseye-slim AS runner
WORKDIR /app
COPY --from=builder /app .
EXPOSE 8080
CMD ["node","src/server.js"]
