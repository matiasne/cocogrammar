import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js uses .env.local; load it (falling back to .env) for drizzle-kit CLI.
loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
