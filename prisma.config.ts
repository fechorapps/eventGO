import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // env() from prisma/config throws when the variable is unset (e.g. during
    // `prisma generate` in the Docker image build), so read process.env directly.
    url: process.env.DATABASE_URL ?? "postgres://postgres:password123@localhost:5448/eventgo",
    // Only used by CLI commands that replay migrations (migrate dev / migrate diff).
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ?? "postgres://postgres:password123@localhost:5448/prisma_shadow_diff",
  },
});
