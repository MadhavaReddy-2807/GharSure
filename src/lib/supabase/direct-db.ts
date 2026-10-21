import postgres from "postgres";

let sqlInstance: ReturnType<typeof postgres> | null = null;

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

export function getDirectSql() {
  if (sqlInstance) return sqlInstance;

  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  // Connect using postgres client with SSL required for Supabase
  sqlInstance = postgres(url, {
    ssl: "require",
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return sqlInstance;
}
