import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { addWatermark } from './lib/pdf/watermark';
require('dotenv').config({path: '../../.env'});
require('dotenv').config({path: '../../.env.local'});
const s3 = new S3Client({region: process.env.AWS_REGION||'eu-north-1', credentials: {accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string}});
s3.send(new GetObjectCommand({Bucket: process.env.AWS_S3_BUCKET_NAME, Key: 'store-items/by-doctor/dr-aman-agarwal/ebooks/originals/ultrasound-book/ultrasound-book.pdf'})).then(async r => {
  const chunks: any[] = [];
  // @ts-ignore
  for await (const chunk of r.Body) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  console.log('PDF downloaded, size:', buf.length);
  const watermarked = await addWatermark(buf, {
      name: 'Test',
      email: 'test@example.com',
      phone: '1234567890',
      orderRef: 'ORD-123',
      date: '2026-06-10'
  });
  console.log('Watermarked successfully!');
}).catch(console.error);
