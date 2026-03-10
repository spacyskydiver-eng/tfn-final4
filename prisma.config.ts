// prisma.config.ts — Prisma 7 configuration file.
// Replaces the `url` field that was previously in schema.prisma's datasource block.
// See: https://pris.ly/d/config-datasource

import path from "path";
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
dotenv.config(); // no-op on Vercel (env vars already injected); loads .env locally

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },

  migrate: {
    async adapter() {
      // Dynamic import so this file is safe to import in Edge/serverless contexts.
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { default: pg } = await import("pg");

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");

      const pool = new pg.Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
