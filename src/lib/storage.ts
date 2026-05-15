import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * Uploads a file buffer to Supabase Storage, Cloudflare R2, or local fallback.
 *
 * Priority: Supabase > R2 > local
 * Supabase env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET
 * R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  type: "audio" | "image"
): Promise<string> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    return uploadToSupabase(buffer, filename, type);
  }

  const r2Ready =
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL;

  return r2Ready
    ? uploadToR2(buffer, filename, type)
    : uploadLocal(buffer, filename, type);
}

async function uploadToSupabase(
  buffer: Buffer,
  filename: string,
  type: "audio" | "image"
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
  const bucket = process.env.SUPABASE_BUCKET ?? "funk-lab";
  const path = type === "image" ? `images/${filename}` : `audio/${filename}`;
  const contentType = type === "image" ? "image/webp" : "audio/mpeg";

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upload failed: ${err}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

async function uploadLocal(
  buffer: Buffer,
  filename: string,
  type: "audio" | "image"
): Promise<string> {
  const subfolder = type === "image" ? "images" : "";
  const dir = join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buffer);
  return type === "image" ? `/uploads/images/${filename}` : `/uploads/${filename}`;
}

async function uploadToR2(
  buffer: Buffer,
  filename: string,
  type: "audio" | "image"
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const key = type === "image" ? `images/${filename}` : `audio/${filename}`;
  const contentType =
    type === "image" ? "image/webp" : "audio/mpeg";

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL!}/${key}`;
}
