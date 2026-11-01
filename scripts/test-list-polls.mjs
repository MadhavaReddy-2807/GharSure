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

async function test() {
  try {
    const polls = await sql`
      SELECT id, title, question, poll_type, coin_reward, status, created_at
      FROM quick_polls
      WHERE status = 'PUBLISHED'
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY created_at DESC;
    `;
    console.log("Polls query result:", polls);

    const pollIds = polls.map((p) => p.id);
    console.log("Poll IDs:", pollIds);

    if (pollIds.length > 0) {
      const options = await sql`
        SELECT id, poll_id, option_text, display_order, vote_count
        FROM quick_poll_options
        WHERE poll_id = ANY(${pollIds})
        ORDER BY display_order ASC;
      `;
      console.log("Options count:", options.length);
      console.log("Sample options:", options.slice(0, 5));
    }
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await sql.end();
  }
}

test();
