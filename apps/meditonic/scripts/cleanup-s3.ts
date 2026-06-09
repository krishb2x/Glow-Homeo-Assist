import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const s3Client = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

const BUCKET = "glow-homeo-files";

const foldersToDelete = [
  "store-items/by-doctor/dr-aman-agarwal/ebooks/originals/common-medicine/",
  "store-items/by-doctor/dr-aman-agarwal/ebooks/originals/xray-book/",
];

async function cleanupS3() {
  console.log("Starting S3 Cleanup...");
  
  for (const prefix of foldersToDelete) {
    try {
      console.log(`Listing objects for prefix: ${prefix}`);
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix
      });
      
      const { Contents } = await s3Client.send(listCommand);
      
      if (!Contents || Contents.length === 0) {
        console.log(`  No objects found for ${prefix}`);
        continue;
      }
      
      const objectsToDelete = Contents.map(c => ({ Key: c.Key }));
      
      console.log(`  Deleting ${objectsToDelete.length} objects...`);
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: objectsToDelete,
          Quiet: true
        }
      });
      
      await s3Client.send(deleteCommand);
      console.log(`  Successfully deleted ${prefix}`);
      
    } catch (err) {
      console.error(`Failed to clean up ${prefix}:`, err);
    }
  }
  
  console.log("Cleanup complete!");
}

cleanupS3();
