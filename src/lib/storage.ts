import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * Uploads a file buffer to either Cloudflare R2 (when env vars are set)
 * or the local public/uploads directory (development fallback).
 *
 * Required env vars for R2:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  type: "audio" | "image"
): Promise<string> {
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
