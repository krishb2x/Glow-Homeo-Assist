import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase"; // just to verify admin auth if needed
// Actually, we should verify the request comes from an authenticated admin.

const BUCKET = process.env.AWS_S3_BUCKET_NAME!;
const REGION = process.env.AWS_REGION || 'eu-north-1';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { slug, contentType, doctorName } = await req.json();

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Determine path
    const docName = doctorName || 'dr-aman-agarwal';
    const key = `store-items/by-doctor/${docName}/ebooks/originals/${slug}/${slug}.pdf`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType || 'application/pdf',
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry

    return NextResponse.json({ url, key });
  } catch (err: any) {
    console.error("Presign error:", err);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
