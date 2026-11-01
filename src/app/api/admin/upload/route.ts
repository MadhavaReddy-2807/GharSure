import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || (!hasAdminPermission(admin.role, "store:write") && !hasAdminPermission(admin.role, "surveys:write"))) {
      return NextResponse.json({ success: false, error: "Unauthorized admin access." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "products";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    // Validate MIME type
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Invalid file format. Only JPEG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds 5MB size limit. Please upload an image under 5MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueFileName = `${bucket}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${fileExt}`;

    // 1. Try uploading to Supabase Storage
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(uniqueFileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        if (publicData?.publicUrl) {
          return NextResponse.json({
            success: true,
            url: publicData.publicUrl,
            fileName: uniqueFileName,
          });
        }
      }
    } catch (err: any) {
      console.warn("[Storage API] Supabase storage upload notice:", err.message);
    }

    // 2. Safe local public storage fallback for instant serving
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", bucket);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${bucket}/${uniqueFileName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName,
      });
    } catch (fsErr: any) {
      // 3. Last fallback: Data URL
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({
        success: true,
        url: dataUrl,
        fileName: uniqueFileName,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process image upload." },
      { status: 500 }
    );
  }
}
