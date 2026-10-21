import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

if (!dbUrl || dbUrl.includes("placeholder")) {
  console.error("\n❌ Error: DATABASE_URL is not set or contains placeholder values.");
  console.error("Please add your Supabase connection string to .env.local:\n");
  console.error('DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"\n');
  process.exit(1);
}

console.log("Connecting directly to Supabase Postgres via connection string...");

const sql = postgres(dbUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 15,
});

async function runMigration() {
  try {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261021000000_gharsure_initial_schema.sql"
    );
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    console.log("Applying migration 20261021000000_gharsure_initial_schema.sql...");

    await sql.unsafe(sqlContent);

    console.log("\n✅ Migration applied successfully!");

    // Verify tables and sequence
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customers', 'otp_challenges', 'customer_sessions', 'audit_events')
      ORDER BY table_name;
    `;

    console.log("Verified database tables:");
    for (const t of tables) {
      console.log(` - ${t.table_name}`);
    }

    const seq = await sql`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public' 
      AND sequence_name = 'customer_id_seq';
    `;

    if (seq.length > 0) {
      console.log(` - customer_id_seq (Sequence for GH000001...)`);
    }

    console.log("\n🎉 Supabase is fully configured and ready for GharSure!\n");
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

runMigration();
