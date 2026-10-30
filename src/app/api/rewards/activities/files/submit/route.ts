import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { submitFileForActivity } from "@/lib/rewards-activities-db";
import { z } from "zod";

const submitSchema = z.object({
  activityId: z.string().min(1, "Activity ID is required"),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL or path is required"),
  fileSizeBytes: z.number().positive("File size must be positive"),
  mimeType: z.string().min(1, "MIME type is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.customerId) {
      return NextResponse.json(
        { success: false, error: "Please log in to submit documents." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid submission" },
        { status: 400 }
      );
    }

    // Allowed MIME types security check
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedMimes.includes(parsed.data.mimeType.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only JPEG, PNG, WEBP, and PDF documents are accepted." },
        { status: 400 }
      );
    }

    const result = await submitFileForActivity({
      activityId: parsed.data.activityId,
      customerId: session.customerId,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      fileSizeBytes: parsed.data.fileSizeBytes,
      mimeType: parsed.data.mimeType,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      submissionId: result.submissionId,
      message: "Document submitted successfully! Our team will review it and credit your coins.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit document" },
      { status: 500 }
    );
  }
}
