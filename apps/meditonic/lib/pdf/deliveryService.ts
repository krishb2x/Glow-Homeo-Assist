/**
 * lib/pdf/deliveryService.ts
 * Orchestrates the full PDF delivery pipeline.
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { addWatermark, BuyerDetails } from './watermark';
import { bookSlug, slugify } from './s3Keys';

const BUCKET = process.env.AWS_S3_BUCKET_NAME!;
const REGION = process.env.AWS_REGION || 'eu-north-1';
const URL_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface DeliveryItem {
  product_id: string;
  title: string;
  slug: string; // Used to compute s3_key
  doctor_name?: string;
  doctor_id?: string;
  stock_status?: string;
  summary?: string;
  requires_watermark?: boolean;
}

export interface DeliveredPdf {
  title: string;
  downloadUrl: string;
  expiresAt: string;
  s3Key: string;
  summary?: string;
}

/**
 * Streams an S3 object into a Buffer
 */
async function s3ToBuffer(key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  if (!res.Body) throw new Error(`Empty body for key: ${key}`);
  
  // @ts-ignore - NodeJS ReadableStream
  const chunks: any[] = [];
  // @ts-ignore
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * Generates a presigned GET URL for an S3 key
 */
async function presignedUrl(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: URL_EXPIRY_SECONDS });
}

/**
 * Processes a single book item
 */
async function processItem(item: DeliveryItem, buyer: BuyerDetails): Promise<DeliveredPdf | null> {
  const slug = item.slug || bookSlug(item.title);
  const docName = item.doctor_name || 'Dr. Aman Agarwal';
  
  // 1. Compute original key
  // Since Meditonic relies on the exact glow-homeo paths, we calculate it dynamically
  const originalKey = `store-items/by-doctor/${slugify(docName)}/ebooks/originals/${slug}/${slug}.pdf`;

  try {
    // 2. Fetch original
    const originalBuffer = await s3ToBuffer(originalKey);

    // 3. Watermark
    let finalBuffer: Uint8Array;
    try {
      finalBuffer = await addWatermark(originalBuffer, {
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        orderRef: buyer.orderRef,
        date: buyer.date,
      });
    } catch (wmError: any) {
      console.error(`[PDF] ERROR: Failed to watermark ${item.title}. The PDF may be encrypted or use unsupported compression. Error: ${wmError.message}`);
      throw new Error(`Watermark failed for ${item.title}`);
    }

    // 4. Build watermarked key
    const wKey = `store-items/by-doctor/${slugify(docName)}/ebooks/orders/${buyer.orderRef}/${slug}-watermarked.pdf`;

    // 5. Upload watermarked copy
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: wKey,
      Body: finalBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        'buyer-name': buyer.name,
        'buyer-email': buyer.email,
        'buyer-phone': buyer.phone || '',
        'order-ref': buyer.orderRef,
      },
    }));

    // 6. Generate presigned URL
    const downloadUrl = await presignedUrl(wKey);
    const expiresAt = new Date(Date.now() + URL_EXPIRY_SECONDS * 1000).toISOString();

    return {
      title: item.title,
      downloadUrl,
      expiresAt,
      s3Key: wKey,
      summary: item.summary,
    };
  } catch (err: any) {
    console.error(`[PDF] Failed to process ${item.title} (Key: ${originalKey}):`, err.message);
    return null;
  }
}

/**
 * Main delivery function — processes all ebook items in an order.
 *
 * @param order - Full mt_orders row from DB
 * @param items - Items extracted from order JSON
 */
export async function deliverPdfs(order: any, items: DeliveryItem[]): Promise<DeliveredPdf[]> {
  const buyer: BuyerDetails = {
    name: order.customer_name || 'Valued Customer',
    email: order.customer_email || '',
    phone: order.customer_phone || '',
    orderRef: order.id,
    date: new Date(order.created_at || Date.now()).toLocaleDateString(),
  };

  const ebookItems = items.filter(i => i.stock_status !== 'out_of_stock');

  if (ebookItems.length === 0) {
    console.log(`[PDF] No ebook items to deliver for order ${order.id}`);
    return [];
  }

  const results = await Promise.allSettled(
    ebookItems.map(item => processItem(item, buyer))
  );

  const delivered: DeliveredPdf[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      delivered.push(result.value);
    } else if (result.status === 'rejected') {
      console.error('[PDF] Item delivery failed:', result.reason);
    }
  }

  return delivered;
}
