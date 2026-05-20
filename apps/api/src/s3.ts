import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.AWS_S3_PRIVATE_BUCKET;

const s3Enabled = Boolean(
  typeof region === "string" && region.length > 0 && typeof accessKeyId === "string" && accessKeyId.length > 0
    && typeof secretAccessKey === "string" && secretAccessKey.length > 0 && typeof bucket === "string" && bucket.length > 0
);

const s3 = s3Enabled
  ? new S3Client({
      region: region as string,
      credentials: { accessKeyId: accessKeyId as string, secretAccessKey: secretAccessKey as string }
    })
  : null;

const bucketName = s3Enabled ? (bucket as string) : "";

export function getPrivateBucketName(): string {
  return bucketName;
}

export function isS3Configured(): boolean {
  return s3Enabled;
}

function requireS3(): S3Client {
  if (!s3) {
    throw new Error(
      "S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_PRIVATE_BUCKET in the monorepo root .env to use uploads and audio."
    );
  }
  return s3;
}

export function buildObjectKey(
  clinicId: string,
  category: "audio" | "document" | "audio-staging" | "pdf",
  filename: string
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  return `clinics/${clinicId}/${category}/${timestamp}-${safeName}`;
}

function encodeCopySourceKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function putObjectBuffer(objectKey: string, body: Buffer, contentType: string): Promise<void> {
  const client = requireS3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: body,
      ContentType: contentType
    })
  );
}

export async function copyObjectInBucket(sourceKey: string, destKey: string): Promise<void> {
  const client = requireS3();
  const copySource = `${bucketName}/${encodeCopySourceKey(sourceKey)}`;
  await client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      Key: destKey,
      CopySource: copySource
    })
  );
}

export async function createUploadUrl(objectKey: string, contentType: string): Promise<string> {
  const client = requireS3();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType
    }),
    { expiresIn: 300 }
  );
}

export async function createDownloadUrl(objectKey: string, expiresInSeconds = 900): Promise<string> {
  const client = requireS3();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteObjectByKey(objectKey: string): Promise<void> {
  const client = requireS3();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    })
  );
}
