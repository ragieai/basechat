import assert from "assert";

import { defineConfig } from "drizzle-kit";

import "dotenv";

assert(process.env.DATABASE_URL);
const DATABASE_URL = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/server/db/schema.ts",
  dbCredentials: { url: DATABASE_URL },
});
