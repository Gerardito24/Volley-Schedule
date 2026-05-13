"use strict";

const path = require("node:path");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");

const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL (or DATABASE_URL_POOLED) is required to run migrations.");
  process.exit(1);
}

async function main() {
  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);
  const migrationsFolder = path.join(__dirname, "..", "drizzle");
  await migrate(db, { migrationsFolder });
  await sql.end({ timeout: 5 });
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
