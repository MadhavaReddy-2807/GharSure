import fs from "fs";
import path from "path";
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
  const sample = await sql`SELECT id, title, status, poll_type FROM quick_polls;`;
  console.log("Existing quick_polls:", sample);

  const constraints = await sql`
    SELECT pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'quick_polls' AND c.conname = 'quick_polls_status_check';
  `;
  console.log("Constraint quick_polls_status_check:", constraints);

  const fileActivities = await sql`SELECT id, title, status, document_type FROM file_activities;`;
  console.log("Existing file_activities:", fileActivities);

  await sql.end();
}

inspect();
