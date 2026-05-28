import { createDownloadUrl, getPrivateBucketName } from "../../s3";

export async function signedObjectUrl(
  objectKey: string | null | undefined,
  expiresInSeconds = 900
): Promise<string | undefined> {
  if (!objectKey || objectKey.startsWith("inline:")) return undefined;
  return createDownloadUrl(objectKey, expiresInSeconds);
}

export function mediaBucket(): string {
  return getPrivateBucketName();
}
