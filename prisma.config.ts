import { defineConfig } from '@prisma/client/runtime';

export default defineConfig({
  datasource: {
    db: {
      // Direct MySQL connection string built from environment variables
      url: `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.DB_HOST || 'db'}:${process.env.DB_PORT || 3306}/${process.env.MYSQL_DATABASE}`,
      // Shadow database used by Prisma Migrate (requires privileges to CREATE DATABASE)
      shadowDatabaseUrl: `mysql://root:${process.env.MYSQL_ROOT_PASSWORD}@${process.env.DB_HOST || 'db'}:${process.env.DB_PORT || 3306}/${process.env.MYSQL_DATABASE}_shadow`,
      // If you prefer Prisma Accelerate, uncomment the line below and set PRISMA_ACCELERATE_URL in .env
      // accelerateUrl: process.env.PRISMA_ACCELERATE_URL,
      // Or provide a custom adapter instead of a URL
      // adapter: myCustomAdapter,
    },
  },
});
