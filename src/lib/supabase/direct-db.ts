import postgres from "postgres";

export function getDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    null
  );
}

export function isDirectDatabaseConfigured(): boolean {
  const url = getDatabaseUrl();
  return Boolean(
    url &&
    !url.includes("placeholder") &&
    (url.startsWith("postgres://") || url.startsWith("postgresql://"))
  );
}

const globalForSql = globalThis as unknown as {
  sqlInstance?: ReturnType<typeof postgres>;
};

export function getDirectSql() {
  if (globalForSql.sqlInstance) return globalForSql.sqlInstance;

  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  // Connect using postgres client with SSL required for Supabase
  const sql = postgres(url, {
    ssl: "require",
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForSql.sqlInstance = sql;
  }

  return sql;
}
