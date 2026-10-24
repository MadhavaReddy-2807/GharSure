import fs from "fs";
import path from "path";
import crypto from "crypto";
import postgres from "postgres";

// Load .env.local
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

if (!dbUrl) {
  console.error("No database URL found in environment.");
  process.exit(1);
}

const sql = postgres(dbUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 15,
});

async function seed() {
  console.log("Connected to Supabase PostgreSQL.");

  // Check existing surveys
  const existing = await sql`SELECT survey_id, title, status FROM surveys ORDER BY created_at DESC;`;
  console.log(`Found ${existing.length} existing survey(s):`, existing.map(s => `${s.survey_id} (${s.status})`));

  // ---------------------------------------------------------------------------
  // Dummy Survey 1: Decision-Based Water Quality Study
  // ---------------------------------------------------------------------------
  const surv1Id = "SURV-WATER-BLR-01";
  const surv1Title = "Bangalore Urban Water Hardness & Purifier Longevity Study";
  const surv1Desc = "Help GharSure map Bangalore groundwater TDS levels, purifier maintenance frequency, and hard water appliance scaling.";
  
  let [s1] = await sql`
    SELECT id, survey_id, status FROM surveys WHERE survey_id = ${surv1Id};
  `;

  if (!s1) {
    [s1] = await sql`
      INSERT INTO surveys (
        survey_id, title, description, survey_type, category, language,
        estimated_duration_min, reward_coins, response_quota, allow_resume,
        allow_review, status, version
      )
      VALUES (
        ${surv1Id}, ${surv1Title}, ${surv1Desc}, 'DECISION_BASED', 'Water Quality', 'en',
        4, 75, 1000, true, true, 'PUBLISHED', 1
      )
      RETURNING id, survey_id, status;
    `;
    console.log(`Created new survey: ${surv1Id} with ID: ${s1.id}`);
  } else {
    await sql`
      UPDATE surveys
      SET title = ${surv1Title}, description = ${surv1Desc}, status = 'PUBLISHED',
          survey_type = 'DECISION_BASED', reward_coins = 75, estimated_duration_min = 4,
          updated_at = NOW()
      WHERE id = ${s1.id};
    `;
    console.log(`Updated survey to PUBLISHED: ${surv1Id}`);
  }

  // Pre-generate UUIDs for questions so branching targets match exactly
  const s1Uuids = {
    source: crypto.randomUUID(),
    tdsKnown: crypto.randomUUID(),
    tdsValue: crypto.randomUUID(),
    purifierOwned: crypto.randomUUID(),
    purifierBrand: crypto.randomUUID(),
    filterChange: crypto.randomUUID(),
    satisfaction: crypto.randomUUID(),
    buyingIntent: crypto.randomUUID(),
    feedback: crypto.randomUUID(),
  };

  await sql`DELETE FROM survey_questions WHERE survey_id = ${s1.id};`;

  const s1Questions = [
    {
      id: s1Uuids.source,
      order_num: 1,
      question_text: "What is the primary source of water supply in your apartment or home?",
      question_type: "SINGLE_CHOICE",
      description: "Select the primary source used for kitchen and bathroom plumbing.",
      options: ["Borewell Water", "Cauvery / Municipal Piped Supply", "Private Water Tanker", "Mixed (Borewell + Tanker)"],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Water Supply Profile",
    },
    {
      id: s1Uuids.tdsKnown,
      order_num: 2,
      question_text: "Do you know the approximate TDS (Total Dissolved Solids) level of your tap water?",
      question_type: "YES_NO",
      description: "Measured with a handheld TDS meter or provided by your society facility manager.",
      options: [],
      is_required: true,
      validation_rules: {},
      branching_rules: [
        {
          conditions: [{ questionId: s1Uuids.tdsKnown, operator: "EQUALS", value: false }],
          matchType: "ALL",
          action: "SKIP_TO_QUESTION",
          targetQuestionId: s1Uuids.purifierOwned,
        },
      ],
      section_name: "Water Supply Profile",
    },
    {
      id: s1Uuids.tdsValue,
      order_num: 3,
      question_text: "What is your measured tap water TDS reading (in ppm)?",
      question_type: "NUMBER",
      description: "Typical Bangalore borewell TDS ranges from 300 to 1200+ ppm.",
      options: [],
      is_required: true,
      validation_rules: { min: 20, max: 3000 },
      branching_rules: [],
      section_name: "Water Supply Profile",
    },
    {
      id: s1Uuids.purifierOwned,
      order_num: 4,
      question_text: "Do you currently use an in-home drinking water purifier?",
      question_type: "YES_NO",
      description: "Includes RO, UV, UF, or gravity-based filtration systems.",
      options: [],
      is_required: true,
      validation_rules: {},
      branching_rules: [
        {
          conditions: [{ questionId: s1Uuids.purifierOwned, operator: "EQUALS", value: false }],
          matchType: "ALL",
          action: "SKIP_TO_QUESTION",
          targetQuestionId: s1Uuids.buyingIntent,
        },
      ],
      section_name: "Purifier Diagnostics",
    },
    {
      id: s1Uuids.purifierBrand,
      order_num: 5,
      question_text: "Which water purifier brand are you currently using?",
      question_type: "SINGLE_CHOICE",
      description: "Select your active purifier system brand.",
      options: ["Kent RO", "Aquaguard / Eureka Forbes", "Pureit (HUL)", "Urban Company Native", "Ao Smith", "Livpure", "Other"],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Purifier Diagnostics",
    },
    {
      id: s1Uuids.filterChange,
      order_num: 6,
      question_text: "How frequently do you replace your RO / sediment filter candles?",
      question_type: "DROPDOWN",
      description: "Routine filter replacement maintains membrane lifespan.",
      options: [
        "Every 3 to 6 months",
        "Every 6 to 12 months",
        "Once a year or longer",
        "Only when water flow slows down or alarm beeps",
      ],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Purifier Diagnostics",
    },
    {
      id: s1Uuids.satisfaction,
      order_num: 7,
      question_text: "Rate your overall satisfaction with your purifier's filtration speed and water taste (1 = Poor, 10 = Outstanding):",
      question_type: "RATING_SCALE",
      description: "Scale from 1 to 10.",
      options: [],
      is_required: true,
      validation_rules: { min: 1, max: 10 },
      branching_rules: [],
      section_name: "Purifier Diagnostics",
    },
    {
      id: s1Uuids.buyingIntent,
      order_num: 8,
      question_text: "Are you considering purchasing or upgrading to an automated IoT-enabled purifier?",
      question_type: "SINGLE_CHOICE",
      description: "IoT purifiers provide real-time filter lifespan tracking and leak alerts.",
      options: ["Yes, within 30 days", "Yes, in 3 to 6 months", "Not at this time"],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Future Upgrades",
    },
    {
      id: s1Uuids.feedback,
      order_num: 9,
      question_text: "Describe any recurring hard water scaling issues on bathroom taps, geysers, or glass partitions:",
      question_type: "LONG_TEXT",
      description: "Optional details on local water issues in your society.",
      options: [],
      is_required: false,
      validation_rules: {},
      branching_rules: [],
      section_name: "Future Upgrades",
    },
  ];

  for (const q of s1Questions) {
    await sql`
      INSERT INTO survey_questions (
        id, survey_id, order_num, question_text, question_type,
        description, options, is_required, validation_rules, branching_rules, section_name
      )
      VALUES (
        ${q.id}, ${s1.id}, ${q.order_num}, ${q.question_text}, ${q.question_type},
        ${q.description}, ${JSON.stringify(q.options)}::jsonb, ${q.is_required},
        ${JSON.stringify(q.validation_rules)}::jsonb, ${JSON.stringify(q.branching_rules)}::jsonb,
        ${q.section_name}
      );
    `;
  }
  console.log(`Inserted ${s1Questions.length} questions for ${surv1Id}`);

  // Create version snapshot for S1
  await sql`
    INSERT INTO survey_versions (survey_id, version_num, snapshot, reward_coins)
    VALUES (
      ${s1.id}, 1,
      ${JSON.stringify({
        survey_id: surv1Id,
        title: surv1Title,
        description: surv1Desc,
        survey_type: "DECISION_BASED",
        questions: s1Questions,
      })}::jsonb,
      75
    )
    ON CONFLICT (survey_id, version_num) DO UPDATE
    SET snapshot = EXCLUDED.snapshot, reward_coins = EXCLUDED.reward_coins, published_at = NOW();
  `;

  // ---------------------------------------------------------------------------
  // Dummy Survey 2: Static Appliance Health Baseline
  // ---------------------------------------------------------------------------
  const surv2Id = "SURV-APPLIANCE-01";
  const surv2Title = "Household Appliance Health & Maintenance Baseline";
  const surv2Desc = "Help GharSure evaluate appliance longevity against hard water wear, scaling, and voltage fluctuations.";

  let [s2] = await sql`
    SELECT id, survey_id, status FROM surveys WHERE survey_id = ${surv2Id};
  `;

  if (!s2) {
    [s2] = await sql`
      INSERT INTO surveys (
        survey_id, title, description, survey_type, category, language,
        estimated_duration_min, reward_coins, response_quota, allow_resume,
        allow_review, status, version
      )
      VALUES (
        ${surv2Id}, ${surv2Title}, ${surv2Desc}, 'STATIC', 'Appliance Health', 'en',
        3, 50, 1000, true, true, 'PUBLISHED', 1
      )
      RETURNING id, survey_id, status;
    `;
    console.log(`Created new survey: ${surv2Id} with ID: ${s2.id}`);
  } else {
    await sql`
      UPDATE surveys
      SET title = ${surv2Title}, description = ${surv2Desc}, status = 'PUBLISHED',
          survey_type = 'STATIC', reward_coins = 50, estimated_duration_min = 3,
          updated_at = NOW()
      WHERE id = ${s2.id};
    `;
    console.log(`Updated survey to PUBLISHED: ${surv2Id}`);
  }

  const s2Uuids = {
    appliances: crypto.randomUUID(),
    descaling: crypto.randomUUID(),
    applianceAge: crypto.randomUUID(),
    matrixService: crypto.randomUUID(),
    starRating: crypto.randomUUID(),
  };

  await sql`DELETE FROM survey_questions WHERE survey_id = ${s2.id};`;

  const s2Questions = [
    {
      id: s2Uuids.appliances,
      order_num: 1,
      question_text: "Select all water-dependent appliances currently installed in your home:",
      question_type: "MULTIPLE_CHOICE",
      description: "Select all that apply in your household.",
      options: [
        "Front Load Washing Machine",
        "Top Load Washing Machine",
        "Dishwasher",
        "Storage Geyser / Water Heater",
        "Instant Geyser",
        "Solar Water Heating System",
      ],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Appliance Inventory",
    },
    {
      id: s2Uuids.descaling,
      order_num: 2,
      question_text: "Do you regularly use descaling tablets, filter inserts, or water softening systems?",
      question_type: "YES_NO",
      description: "Descaling prevents heating element calcification.",
      options: [],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Appliance Inventory",
    },
    {
      id: s2Uuids.applianceAge,
      order_num: 3,
      question_text: "What is the average age of your major home appliances?",
      question_type: "SINGLE_CHOICE",
      description: "Approximate age since original purchase.",
      options: ["Under 1 year", "1 to 3 years", "3 to 5 years", "More than 5 years"],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Maintenance & Lifespan",
    },
    {
      id: s2Uuids.matrixService,
      order_num: 4,
      question_text: "Rate your experience across different maintenance and repair services:",
      question_type: "MATRIX",
      description: "Evaluate each service provider category.",
      options: {
        matrixRows: ["Brand Authorized Service Centers", "Local Neighborhood Electricians", "App-Based On-Demand Technicians"],
        matrixCols: ["Poor", "Fair", "Good", "Excellent"],
      },
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Maintenance & Lifespan",
    },
    {
      id: s2Uuids.starRating,
      order_num: 5,
      question_text: "Overall, how confident are you in the long-term durability of your home appliances?",
      question_type: "STAR_RATING",
      description: "1 to 5 stars.",
      options: [],
      is_required: true,
      validation_rules: {},
      branching_rules: [],
      section_name: "Maintenance & Lifespan",
    },
  ];

  for (const q of s2Questions) {
    await sql`
      INSERT INTO survey_questions (
        id, survey_id, order_num, question_text, question_type,
        description, options, is_required, validation_rules, branching_rules, section_name
      )
      VALUES (
        ${q.id}, ${s2.id}, ${q.order_num}, ${q.question_text}, ${q.question_type},
        ${q.description}, ${JSON.stringify(q.options)}::jsonb, ${q.is_required},
        ${JSON.stringify(q.validation_rules)}::jsonb, ${JSON.stringify(q.branching_rules)}::jsonb,
        ${q.section_name}
      );
    `;
  }
  console.log(`Inserted ${s2Questions.length} questions for ${surv2Id}`);

  await sql`
    INSERT INTO survey_versions (survey_id, version_num, snapshot, reward_coins)
    VALUES (
      ${s2.id}, 1,
      ${JSON.stringify({
        survey_id: surv2Id,
        title: surv2Title,
        description: surv2Desc,
        survey_type: "STATIC",
        questions: s2Questions,
      })}::jsonb,
      50
    )
    ON CONFLICT (survey_id, version_num) DO UPDATE
    SET snapshot = EXCLUDED.snapshot, reward_coins = EXCLUDED.reward_coins, published_at = NOW();
  `;

  console.log("\n✅ Successfully seeded and published 2 dummy surveys in PostgreSQL!");
  await sql.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
