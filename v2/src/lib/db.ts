import postgres from "postgres";

// Cliente Postgres compartido (postgres.js). Mismo patrón que el app de
// producción: singleton global para no agotar conexiones en dev/serverless.

const globalForDb = globalThis as unknown as {
  __volleyhubSql?: postgres.Sql;
};

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  return url ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL);
}

export const sql =
  globalForDb.__volleyhubSql ??
  postgres(getDatabaseUrl(), {
    max: 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__volleyhubSql = sql;
}
