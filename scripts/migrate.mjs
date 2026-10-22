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

async function runMigrations() {
  try {
    const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} migration file(s) in supabase/migrations:\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`--> Applying ${file}...`);
      const sqlContent = fs.readFileSync(filePath, "utf-8");
      await sql.unsafe(sqlContent);
      console.log(`    ✓ ${file} applied successfully.\n`);
    }

    console.log("✅ All migrations applied successfully!\n");

    // Verify critical tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log("Verified database tables in public schema:");
    for (const t of tables) {
      console.log(` - ${t.table_name}`);
    }

    // Verify initial admin user
    const admins = await sql`
      SELECT id, email, full_name, role, status, created_at 
      FROM admin_users;
    `;
    console.log("\nConfigured Admin Users:");
    for (const a of admins) {
      console.log(` - ${a.email} (${a.role}, ${a.status})`);
    }

    console.log("\n🎉 Supabase is fully configured and ready for GharSure Admin Portal!\n");
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
    if (err.hint) console.error("Hint:", err.hint);
    await sql.end();
    process.exit(1);
  }
}

runMigrations();
