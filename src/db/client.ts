import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as {
  __volleyscheduleSql?: postgres.Sql;
};

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  return url ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL);
}

const sql =
  globalForDb.__volleyscheduleSql ??
  postgres(getDatabaseUrl(), {
    max: 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__volleyscheduleSql = sql;
}

export const db = drizzle(sql, { schema });
