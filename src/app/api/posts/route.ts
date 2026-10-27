import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  content: z.string().trim().min(5, "Details must be at least 5 characters").max(2000),
  category: z.string().default("Water Quality"),
  postType: z.enum(["QUESTION", "OBSERVATION", "DISCUSSION"]).default("QUESTION"),
});

// In-memory posts fallback
const inMemoryPosts: any[] = [
  {
    id: "post-seed-1",
    post_type: "QUESTION",
    title: "How often should RO pre-filters be replaced in areas with 400+ ppm TDS?",
    content: "Our apartment society has borewell water with 420 ppm TDS. Should sediment filters be swapped quarterly or semi-annually?",
    category: "Water Quality",
    likes_count: 8,
    replies_count: 4,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    author_name: "Rahul M.",
    city: "Bangalore",
  },
  {
    id: "post-seed-2",
    post_type: "OBSERVATION",
    title: "Eco Descaler pouch worked wonders on our bathroom geyser",
    content: "Used the 200g food-grade citric descaler from the store trial. Heating time dropped from 25 mins to 12 mins within a single cycle.",
    category: "Home Care",
    likes_count: 14,
    replies_count: 2,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    author_name: "Priya S.",
    city: "Hyderabad",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const session = await getCurrentSession();

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        const rows = await sql`
          SELECT 
            p.id, p.post_type, p.title, p.content, p.category, p.city,
            p.likes_count, p.replies_count, p.created_at, p.status,
            c.full_name as author_name, c.display_name
          FROM community_posts p
          LEFT JOIN customers c ON p.customer_id = c.id
          WHERE (${customerId}::text IS NULL OR p.customer_id::text = ${customerId} OR (${customerId} = 'me' AND p.customer_id::text = ${session?.customerId || ''}))
          ORDER BY p.created_at DESC
          LIMIT 50;
        `;
        return NextResponse.json({ success: true, posts: rows });
      } catch (err: any) {
        console.warn("[Posts API] DB error fetching posts, using fallback:", err.message);
      }
    }

    let posts = [...inMemoryPosts];
    if (customerId === "me" && session?.customerId) {
      posts = posts.filter((p) => p.customer_id === session.customerId);
    }

    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.customerId) {
      return NextResponse.json(
        { success: false, error: "Please sign in to publish a question or community post." },
        { status: 401 }
      );
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer profile not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid post data" },
        { status: 400 }
      );
    }

    const { title, content, category, postType } = parsed.data;

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        const rows = await sql`
          INSERT INTO community_posts (
            customer_id, post_type, title, content, category, city, status
          )
          VALUES (
            ${customer.id}, ${postType}, ${title}, ${content}, ${category},
            ${customer.city || 'Bangalore'}, 'PUBLISHED'
          )
          RETURNING *;
        `;

        return NextResponse.json({
          success: true,
          post: rows[0],
          message: "Your post / question has been published to the community!",
        });
      } catch (err: any) {
        console.warn("[Posts API] DB error inserting post, using fallback:", err.message);
      }
    }

    // In-memory fallback
    const newPost = {
      id: `post-${Date.now()}`,
      customer_id: customer.id,
      post_type: postType,
      title,
      content,
      category,
      city: customer.city || "Bangalore",
      author_name: customer.full_name || "Community Member",
      likes_count: 0,
      replies_count: 0,
      created_at: new Date().toISOString(),
      status: "PUBLISHED",
    };
    inMemoryPosts.unshift(newPost);

    return NextResponse.json({
      success: true,
      post: newPost,
      message: "Your post / question has been published to the community!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
