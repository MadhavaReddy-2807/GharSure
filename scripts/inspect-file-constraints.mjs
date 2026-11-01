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
  const constraints = await sql`
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'file_activities'::regclass;
  `;
  console.log("file_activities constraints:", constraints);
  await sql.end();
}

inspect();
