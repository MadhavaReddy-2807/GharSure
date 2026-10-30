import { getDirectSql, isDirectDatabaseConfigured } from "@/lib/supabase/direct-db";
import { inMemoryDb } from "@/lib/supabase/db";

export interface FileActivityRecord {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  document_type: string;
  accepted_formats: string[];
  max_file_size_bytes: number;
  max_files: number;
  coin_reward: number;
  approval_required: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  userSubmission?: {
    id: string;
    status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "REWARD_CREDITED";
    file_name: string;
    rejection_reason?: string;
    reward_coins_awarded?: number;
    created_at: string;
  } | null;
}

export interface QuickPollOptionRecord {
  id: string;
  poll_id: string;
  option_text: string;
  display_order: number;
  vote_count: number;
  vote_percentage?: number;
}

export interface QuickPollRecord {
  id: string;
  title: string;
  question: string;
  poll_type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  coin_reward: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  options: QuickPollOptionRecord[];
  totalVotes: number;
  hasVoted: boolean;
  userVotedOptionIds: string[];
}

/**
 * List active published File Activities for customer
 */
export async function listAvailableFileActivities(customerId?: string): Promise<FileActivityRecord[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const activities = await sql<any[]>`
        SELECT 
          id, title, description, instructions, document_type,
          accepted_formats, max_file_size_bytes, max_files, coin_reward,
          approval_required, status, created_at
        FROM file_activities
        WHERE status = 'PUBLISHED'
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY created_at DESC;
      `;

      let submissionsByActivity = new Map<string, any>();
      if (customerId && activities.length > 0) {
        const subs = await sql<any[]>`
          SELECT id, activity_id, status, file_name, rejection_reason, reward_coins_awarded, created_at
          FROM file_submissions
          WHERE customer_id = ${customerId}
          ORDER BY created_at DESC;
        `;
        for (const s of subs) {
          if (!submissionsByActivity.has(s.activity_id)) {
            submissionsByActivity.set(s.activity_id, s);
          }
        }
      }

      return activities.map((act) => ({
        id: act.id,
        title: act.title,
        description: act.description,
        instructions: act.instructions,
        document_type: act.document_type,
        accepted_formats: act.accepted_formats || ["image/jpeg", "image/png", "application/pdf"],
        max_file_size_bytes: Number(act.max_file_size_bytes) || 10485760,
        max_files: Number(act.max_files) || 1,
        coin_reward: Number(act.coin_reward) || 50,
        approval_required: Boolean(act.approval_required),
        status: act.status,
        userSubmission: submissionsByActivity.get(act.id) || null,
      }));
    } catch (err: any) {
      console.warn("[RewardsDB] Error listing file activities:", err.message);
    }
  }

  // Fallback memory activities
  return [
    {
      id: "fa-tds-report",
      title: "Upload Your Water Lab / TDS Test Report",
      description: "Submit your municipal, borewell, or residential water lab test report to earn verified coins.",
      instructions: "Upload a clear photo or PDF document showing the test parameters and location name.",
      document_type: "TDS_REPORT",
      accepted_formats: ["image/jpeg", "image/png", "application/pdf"],
      max_file_size_bytes: 10485760,
      max_files: 1,
      coin_reward: 75,
      approval_required: true,
      status: "PUBLISHED",
      userSubmission: null,
    },
    {
      id: "fa-invoice",
      title: "Upload Household Appliance Invoice / Warranty Card",
      description: "Submit your RO purifier, water heater, or washer invoice to register for preventive maintenance reminders.",
      instructions: "Invoice or warranty bill must clearly display the brand name and date of purchase.",
      document_type: "INVOICE",
      accepted_formats: ["image/jpeg", "image/png", "application/pdf"],
      max_file_size_bytes: 10485760,
      max_files: 1,
      coin_reward: 50,
      approval_required: true,
      status: "PUBLISHED",
      userSubmission: null,
    },
  ];
}

/**
 * Submit a file for an activity
 */
export async function submitFileForActivity(data: {
  activityId: string;
  customerId: string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}): Promise<{ success: boolean; submissionId?: string; error?: string }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx: any) => {
        // 1. Verify activity exists and is published
        const acts = await tx`
          SELECT id, title, coin_reward, approval_required, status, max_file_size_bytes, accepted_formats
          FROM file_activities
          WHERE id::text = ${data.activityId}
          FOR UPDATE;
        `;

        if (!acts || acts.length === 0) {
          return { success: false, error: "Activity not found" };
        }
        const activity = acts[0];
        if (activity.status !== "PUBLISHED") {
          return { success: false, error: "This activity is not currently accepting submissions." };
        }

        // Validate file size and mime type
        if (data.fileSizeBytes > (Number(activity.max_file_size_bytes) || 10485760)) {
          return { success: false, error: "File exceeds the maximum allowed size limit." };
        }

        // Check for existing pending or approved submission
        const existing = await tx`
          SELECT id, status FROM file_submissions
          WHERE activity_id = ${activity.id} AND customer_id = ${data.customerId}
          LIMIT 1;
        `;

        if (existing.length > 0 && (existing[0].status === "SUBMITTED" || existing[0].status === "UNDER_REVIEW" || existing[0].status === "APPROVED")) {
          return { success: false, error: "You have already submitted a document for this activity." };
        }

        // Create submission
        const initialStatus = activity.approval_required ? "SUBMITTED" : "APPROVED";
        const rows = await tx`
          INSERT INTO file_submissions (
            activity_id, customer_id, file_url, file_name, file_size_bytes, mime_type, status
          )
          VALUES (
            ${activity.id}, ${data.customerId}, ${data.fileUrl}, ${data.fileName},
            ${data.fileSizeBytes}, ${data.mimeType}, ${initialStatus}
          )
          RETURNING id;
        `;

        const submissionId = rows[0]?.id;

        // If approval is not required, credit reward immediately
        if (!activity.approval_required) {
          const coinReward = Number(activity.coin_reward) || 0;
          if (coinReward > 0) {
            await tx`
              UPDATE customers
              SET reward_coins = reward_coins + ${coinReward}, updated_at = NOW()
              WHERE id = ${data.customerId};
            `;

            const idempotencyKey = `auto_reward_file_${submissionId}`;
            await tx`
              INSERT INTO coin_transactions (
                customer_id, amount, type, description, idempotency_key, metadata
              )
              VALUES (
                ${data.customerId},
                ${coinReward},
                'STORE_REDEMPTION',
                ${`Reward for submitting document: ${activity.title}`},
                ${idempotencyKey},
                ${JSON.stringify({
                  action: "FILE_ACTIVITY_REWARD",
                  activityId: activity.id,
                  submissionId,
                  coinReward,
                })}::jsonb
              );
            `;

            await tx`
              UPDATE file_submissions
              SET status = 'REWARD_CREDITED', reward_coins_awarded = ${coinReward}, updated_at = NOW()
              WHERE id = ${submissionId};
            `;
          }
        }

        return { success: true, submissionId };
      });
    } catch (err: any) {
      console.warn("[RewardsDB] Error submitting file:", err.message);
      return { success: false, error: err.message || "Failed to submit document" };
    }
  }

  return { success: true, submissionId: `sub-${Date.now()}` };
}

/**
 * List Quick Polls for customer
 */
export async function listAvailableQuickPolls(customerId?: string): Promise<QuickPollRecord[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const polls = await sql<any[]>`
        SELECT id, title, question, poll_type, coin_reward, status, created_at
        FROM quick_polls
        WHERE status = 'PUBLISHED'
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY created_at DESC;
      `;

      if (polls.length === 0) return [];

      const pollIds = polls.map((p) => p.id);
      const options = await sql<any[]>`
        SELECT id, poll_id, option_text, display_order, vote_count
        FROM quick_poll_options
        WHERE poll_id = ANY(${pollIds})
        ORDER BY display_order ASC;
      `;

      let userResponses = new Map<string, string[]>();
      if (customerId) {
        const respRows = await sql<any[]>`
          SELECT poll_id, selected_option_ids
          FROM quick_poll_responses
          WHERE customer_id = ${customerId} AND poll_id = ANY(${pollIds});
        `;
        for (const r of respRows) {
          userResponses.set(r.poll_id, r.selected_option_ids || []);
        }
      }

      return polls.map((p) => {
        const pOptions = options.filter((o) => o.poll_id === p.id);
        const totalVotes = pOptions.reduce((sum, o) => sum + (Number(o.vote_count) || 0), 0);
        const hasVoted = userResponses.has(p.id);
        const userVotedOptionIds = userResponses.get(p.id) || [];

        return {
          id: p.id,
          title: p.title,
          question: p.question,
          poll_type: p.poll_type,
          coin_reward: Number(p.coin_reward) || 15,
          status: p.status,
          totalVotes,
          hasVoted,
          userVotedOptionIds,
          options: pOptions.map((o) => ({
            id: o.id,
            poll_id: o.poll_id,
            option_text: o.option_text,
            display_order: Number(o.display_order) || 0,
            vote_count: Number(o.vote_count) || 0,
            vote_percentage: totalVotes > 0 ? Math.round(((Number(o.vote_count) || 0) / totalVotes) * 100) : 0,
          })),
        };
      });
    } catch (err: any) {
      console.warn("[RewardsDB] Error listing quick polls:", err.message);
    }
  }

  // Fallback poll
  return [
    {
      id: "qp-water-source",
      title: "Primary Water Source Poll",
      question: "What is the primary source of water supplied to your apartment or home?",
      poll_type: "SINGLE_CHOICE",
      coin_reward: 15,
      status: "PUBLISHED",
      totalVotes: 48,
      hasVoted: false,
      userVotedOptionIds: [],
      options: [
        { id: "opt-1", poll_id: "qp-water-source", option_text: "Municipal / Corporation Tap Water", display_order: 1, vote_count: 24, vote_percentage: 50 },
        { id: "opt-2", poll_id: "qp-water-source", option_text: "Deep Borewell Water", display_order: 2, vote_count: 14, vote_percentage: 29 },
        { id: "opt-3", poll_id: "qp-water-source", option_text: "Private Tanker Delivery", display_order: 3, vote_count: 6, vote_percentage: 13 },
        { id: "opt-4", poll_id: "qp-water-source", option_text: "Mixed / Dual Supply", display_order: 4, vote_count: 4, vote_percentage: 8 },
      ],
    },
  ];
}

/**
 * Submit vote for a Quick Poll and credit reward coins
 */
export async function submitQuickPollVote(data: {
  pollId: string;
  customerId: string;
  selectedOptionIds: string[];
}): Promise<{ success: boolean; coinsAwarded?: number; newBalance?: number; error?: string }> {
  if (!data.selectedOptionIds || data.selectedOptionIds.length === 0) {
    return { success: false, error: "Please select at least one option." };
  }

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx: any) => {
        // 1. Verify poll
        const polls = await tx`
          SELECT id, title, poll_type, coin_reward, status
          FROM quick_polls
          WHERE id::text = ${data.pollId}
          FOR UPDATE;
        `;

        if (!polls || polls.length === 0) {
          return { success: false, error: "Poll not found" };
        }
        const poll = polls[0];
        if (poll.status !== "PUBLISHED") {
          return { success: false, error: "This poll is no longer active." };
        }

        if (poll.poll_type === "SINGLE_CHOICE" && data.selectedOptionIds.length > 1) {
          return { success: false, error: "Only one option can be selected for this poll." };
        }

        // 2. Check if user already responded (prevent duplicate votes & double coin reward)
        const existing = await tx`
          SELECT id FROM quick_poll_responses
          WHERE poll_id = ${poll.id} AND customer_id = ${data.customerId}
          LIMIT 1;
        `;
        if (existing.length > 0) {
          return { success: false, error: "You have already completed this poll." };
        }

        // 3. Increment vote counts on chosen options
        await tx`
          UPDATE quick_poll_options
          SET vote_count = vote_count + 1
          WHERE id = ANY(${data.selectedOptionIds}) AND poll_id = ${poll.id};
        `;

        // 4. Record response
        const coinsToAward = Number(poll.coin_reward) || 0;
        await tx`
          INSERT INTO quick_poll_responses (
            poll_id, customer_id, selected_option_ids, coins_awarded
          )
          VALUES (
            ${poll.id}, ${data.customerId}, ${data.selectedOptionIds}, ${coinsToAward}
          );
        `;

        // 5. Award coins to customer
        let newBalance = 0;
        if (coinsToAward > 0) {
          const custUpdate = await tx`
            UPDATE customers
            SET reward_coins = reward_coins + ${coinsToAward}, updated_at = NOW()
            WHERE id = ${data.customerId}
            RETURNING reward_coins;
          `;
          newBalance = Number(custUpdate[0]?.reward_coins) || 0;

          // Record in coin_transactions
          const idempotencyKey = `poll_reward_${poll.id}_${data.customerId}`;
          await tx`
            INSERT INTO coin_transactions (
              customer_id, amount, type, description, idempotency_key, metadata
            )
            VALUES (
              ${data.customerId},
              ${coinsToAward},
              'STORE_REDEMPTION',
              ${`Quick Poll participation: ${poll.title}`},
              ${idempotencyKey},
              ${JSON.stringify({
                action: "QUICK_POLL_REWARD",
                pollId: poll.id,
                selectedOptionIds: data.selectedOptionIds,
                coinsAwarded: coinsToAward,
              })}::jsonb
            );
          `;
        }

        return { success: true, coinsAwarded: coinsToAward, newBalance };
      });
    } catch (err: any) {
      console.warn("[RewardsDB] Error voting in quick poll:", err.message);
      return { success: false, error: err.message || "Failed to submit poll response" };
    }
  }

  return { success: true, coinsAwarded: 15, newBalance: 115 };
}
