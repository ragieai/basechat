// This file exists to deploy migrations from the docker container built
// by the Dockerfile in the root of this repository. It's intentionally
// written as a plain .js file because it is not part of the nextjs build
// process.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

const db = drizzle(databaseUrl);

console.log("Migrating database...");

(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
})();
