import fs from "fs";
import postgres from "postgres";

const content = fs.readFileSync(".env.local", "utf-8");
let dbUrl = "";
for (const line of content.split("\n")) {
  if (line.startsWith("DATABASE_URL=")) {
    dbUrl = line.split("=")[1].trim().replace(/^["']|["']$/g, "");
  }
}

const sql = postgres(dbUrl, { ssl: "require", max: 1 });

async function inspect() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'file_submissions';
  `;
  console.log("file_submissions columns:", cols);
  await sql.end();
}

inspect();
