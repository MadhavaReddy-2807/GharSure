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

async function seed() {
  console.log("Seeding dummy Quick Polls, File Activities, and Upload Submissions...");

  // Clean up partial inserts
  await sql`DELETE FROM quick_polls WHERE question = 'What is the primary source of drinking water in your home?';`;

  // 1. Seed Dummy Quick Polls
  const dummyPolls = [
    {
      title: "Drinking Water Source",
      question: "What is the primary source of drinking water in your home?",
      poll_type: "SINGLE_CHOICE",
      coin_reward: 15,
      status: "PUBLISHED",
      options: [
        { text: "Direct RO Purifier at home", votes: 48 },
        { text: "20-Litre Water Jar / Tanker delivery", votes: 26 },
        { text: "Boiled Tap / Municipal Water", votes: 14 },
        { text: "Direct Municipal Tap (No Purifier)", votes: 6 },
      ],
    },
    {
      title: "Tap Water Taste & Odor",
      question: "How would you describe the taste or smell of your bathroom and kitchen tap water?",
      poll_type: "SINGLE_CHOICE",
      coin_reward: 20,
      status: "PUBLISHED",
      options: [
        { text: "Clear and odorless (Good)", votes: 35 },
        { text: "Slightly salty / hard water residue", votes: 45 },
        { text: "Strong chlorine smell", votes: 15 },
        { text: "Cloudy or occasional brown tint", votes: 5 },
      ],
    },
    {
      title: "Purifier Filter Service Frequency",
      question: "How often do you replace or service your water purifier filters?",
      poll_type: "SINGLE_CHOICE",
      coin_reward: 15,
      status: "PUBLISHED",
      options: [
        { text: "Every 6 months strictly", votes: 22 },
        { text: "Once a year on annual AMC", votes: 54 },
        { text: "Only when taste changes or flow stops", votes: 18 },
        { text: "We don't have an RO purifier", votes: 6 },
      ],
    },
    {
      title: "Hard Water Impacts",
      question: "Which of these hard water issues do you notice most in your home?",
      poll_type: "SINGLE_CHOICE",
      coin_reward: 25,
      status: "PUBLISHED",
      options: [
        { text: "White scaling on taps, tiles, and geysers", votes: 58 },
        { text: "Excessive hair fall and dry skin", votes: 62 },
        { text: "Soap doesn't lather easily", votes: 24 },
        { text: "No noticeable issues", votes: 8 },
      ],
    },
    {
      title: "Water Tank Cleaning Schedule",
      question: "When was your overhead/underground water tank last professionally cleaned?",
      poll_type: "SINGLE_CHOICE",
      coin_reward: 15,
      status: "PUBLISHED",
      options: [
        { text: "Within the last 3 months", votes: 19 },
        { text: "3 to 6 months ago", votes: 31 },
        { text: "Over a year ago", votes: 28 },
        { text: "Managed by society / Not sure", votes: 42 },
      ],
    },
  ];

  for (const p of dummyPolls) {
    const existing = await sql`SELECT id FROM quick_polls WHERE question = ${p.question} LIMIT 1;`;
    let pollId;
    if (existing.length === 0) {
      const inserted = await sql`
        INSERT INTO quick_polls (title, question, poll_type, coin_reward, status, created_at, updated_at)
        VALUES (${p.title}, ${p.question}, ${p.poll_type}, ${p.coin_reward}, ${p.status}, NOW(), NOW())
        RETURNING id;
      `;
      pollId = inserted[0].id;
      console.log(`Created Quick Poll: "${p.title}" (ID: ${pollId})`);

      for (let i = 0; i < p.options.length; i++) {
        await sql`
          INSERT INTO quick_poll_options (poll_id, option_text, display_order, vote_count)
          VALUES (${pollId}, ${p.options[i].text}, ${i + 1}, ${p.options[i].votes});
        `;
      }
    } else {
      console.log(`Poll already exists: "${p.title}"`);
    }
  }

  // 2. Seed Dummy File Upload Activities
  const dummyActivities = [
    {
      title: "Upload TDS Meter Water Reading",
      description: "Take a clear photo of your digital TDS meter showing the PPM reading of your tap or RO water.",
      instructions: "Hold the meter steady with the digital display clearly legible. Both raw tap water and RO purified water tests are welcome.",
      document_type: "TDS_REPORT",
      accepted_formats: ["image/jpeg", "image/png", "image/webp"],
      max_file_size_bytes: 10485760,
      coin_reward: 75,
      approval_required: true,
      status: "PUBLISHED",
    },
    {
      title: "Monthly Water or Utility Bill",
      description: "Upload a copy of your recent water supply bill or society water maintenance invoice.",
      instructions: "Ensure the connection details, apartment unit, and bill date are clearly readable.",
      document_type: "WATER_BILL",
      accepted_formats: ["image/jpeg", "image/png", "application/pdf"],
      max_file_size_bytes: 10485760,
      coin_reward: 50,
      approval_required: true,
      status: "PUBLISHED",
    },
    {
      title: "Home Water Purifier Setup Photo",
      description: "Share a snapshot of your current RO/UV water purifier or filter setup in your kitchen.",
      instructions: "Show the full unit mounted on the wall or under-counter, including brand name.",
      document_type: "PURIFIER_PHOTO",
      accepted_formats: ["image/jpeg", "image/png"],
      max_file_size_bytes: 10485760,
      coin_reward: 60,
      approval_required: true,
      status: "PUBLISHED",
    },
    {
      title: "Water Quality Strip Test Photo",
      description: "Snap a photo of your color chemical test strip placed beside the reference color gradient card.",
      instructions: "Compare pH, total hardness, and chlorine levels under bright daylight.",
      document_type: "TEST_STRIP",
      accepted_formats: ["image/jpeg", "image/png"],
      max_file_size_bytes: 10485760,
      coin_reward: 40,
      approval_required: true,
      status: "PUBLISHED",
    },
  ];

  const createdActivities = [];

  for (const act of dummyActivities) {
    const existing = await sql`SELECT id, title FROM file_activities WHERE title = ${act.title} LIMIT 1;`;
    if (existing.length === 0) {
      const inserted = await sql`
        INSERT INTO file_activities (
          title, description, instructions, document_type,
          accepted_formats, max_file_size_bytes, coin_reward,
          approval_required, status, created_at, updated_at
        )
        VALUES (
          ${act.title}, ${act.description}, ${act.instructions}, ${act.document_type},
          ${act.accepted_formats}, ${act.max_file_size_bytes}, ${act.coin_reward},
          ${act.approval_required}, ${act.status}, NOW(), NOW()
        )
        RETURNING id, title;
      `;
      console.log(`Created File Activity: "${act.title}" (ID: ${inserted[0].id})`);
      createdActivities.push(inserted[0]);
    } else {
      console.log(`File Activity already exists: "${act.title}"`);
      createdActivities.push(existing[0]);
    }
  }

  // 3. Seed Sample Dummy Upload Submissions with Real Unsplash Images
  const customers = await sql`SELECT id, customer_id, full_name FROM customers LIMIT 3;`;
  if (customers.length > 0 && createdActivities.length > 0) {
    const dummySubmissions = [
      {
        activity_id: createdActivities[0].id,
        customer_id: customers[0].id,
        file_url: "https://images.unsplash.com/photo-1584727638096-042c45049ebe?auto=format&fit=crop&w=800&q=80",
        file_name: "tds_meter_reading_kitchen_tap.jpg",
        file_size_bytes: 1420500,
        mime_type: "image/jpeg",
        status: "SUBMITTED",
        reviewer_notes: null,
      },
      {
        activity_id: createdActivities[1]?.id || createdActivities[0].id,
        customer_id: customers[0].id,
        file_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
        file_name: "bwssb_water_utility_bill_oct2026.pdf",
        file_size_bytes: 845200,
        mime_type: "application/pdf",
        status: "APPROVED",
        reviewer_notes: "Verified water supply consumer number. 50 coins awarded.",
        reward_coins_awarded: 50,
      },
      {
        activity_id: createdActivities[2]?.id || createdActivities[0].id,
        customer_id: customers[customers.length > 1 ? 1 : 0].id,
        file_url: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800&q=80",
        file_name: "kent_grand_plus_ro_purifier.jpg",
        file_size_bytes: 2150000,
        mime_type: "image/jpeg",
        status: "APPROVED",
        reviewer_notes: "Purifier model and pre-filter installation verified.",
        reward_coins_awarded: 60,
      },
      {
        activity_id: createdActivities[3]?.id || createdActivities[0].id,
        customer_id: customers[customers.length > 2 ? 2 : 0].id,
        file_url: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80",
        file_name: "water_ph_strip_test_result.jpg",
        file_size_bytes: 1120000,
        mime_type: "image/jpeg",
        status: "REJECTED",
        reviewer_notes: "Image is blurry; color comparison strip is unreadable. Please re-upload under brighter lighting.",
      },
    ];

    for (const sub of dummySubmissions) {
      const exists = await sql`
        SELECT id FROM file_submissions
        WHERE file_name = ${sub.file_name} AND customer_id = ${sub.customer_id}
        LIMIT 1;
      `;
      if (exists.length === 0) {
        await sql`
          INSERT INTO file_submissions (
            activity_id, customer_id, file_url, file_name,
            file_size_bytes, mime_type, status, reviewer_notes,
            reward_coins_awarded, created_at, updated_at
          )
          VALUES (
            ${sub.activity_id}, ${sub.customer_id}, ${sub.file_url}, ${sub.file_name},
            ${sub.file_size_bytes}, ${sub.mime_type}, ${sub.status}, ${sub.reviewer_notes},
            ${sub.reward_coins_awarded || null}, NOW(), NOW()
          );
        `;
        console.log(`Created sample dummy file submission: ${sub.file_name} (${sub.status})`);
      }
    }
  }

  console.log("\nAll dummy quick polls and upload image activities seeded successfully!");
  await sql.end();
}

seed().catch((err) => {
  console.error("Error seeding:", err);
  process.exit(1);
});
