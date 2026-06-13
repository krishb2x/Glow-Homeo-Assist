import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { addWatermark, BuyerDetails } from './watermark';
import { bookSlug, slugify } from './s3Keys';
import { sendConfirmationEmail } from './emailService';
import { Template_StoreProductDelivery } from './emailTemplates';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { supabaseAdmin } from '../../supabase';

const BUCKET = env.AWS_S3_BUCKET_NAME!;
const REGION = env.AWS_REGION || 'eu-north-1';
const URL_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface DeliveryItem {
  product_id: string;
  title: string;
  slug: string;
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

async function s3ToBuffer(key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  if (!res.Body) throw new Error(`Empty body for key: ${key}`);
  
  const chunks: any[] = [];
  for await (const chunk of res.Body as any) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function presignedUrl(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: URL_EXPIRY_SECONDS });
}

async function processItem(item: DeliveryItem, buyer: BuyerDetails): Promise<DeliveredPdf | { errorMsg: string }> {
  const slug = item.slug || bookSlug(item.title);
  const docName = item.doctor_name || 'Dr. Aman Agarwal';
  
  const originalKey = `store-items/by-doctor/${slugify(docName)}/ebooks/originals/${slug}/${slug}.pdf`;

  try {
    const originalBuffer = await s3ToBuffer(originalKey);

    let finalBuffer: Uint8Array;
    try {
      finalBuffer = await addWatermark(originalBuffer, buyer, item.requires_watermark !== false);
    } catch (wmError: any) {
      logger.error(`[PDF Worker] Failed to watermark ${item.title}. Error: ${wmError.message}`);
      throw new Error(`Encryption failed: ${wmError.message}`);
    }

    const wKey = `store-items/by-doctor/${slugify(docName)}/ebooks/orders/${buyer.orderRef}/${slug}-watermarked.pdf`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: wKey,
      Body: finalBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: 'attachment',
      Metadata: {
        'buyer-name': Buffer.from(buyer.name).toString('base64'),
        'buyer-email': Buffer.from(buyer.email).toString('base64'),
        'order-ref': buyer.orderRef,
      }
    }));

    const downloadUrl = await presignedUrl(wKey);
    const expiresAt = new Date(Date.now() + URL_EXPIRY_SECONDS * 1000).toISOString();

    return {
      title: item.title,
      downloadUrl,
      expiresAt,
      s3Key: wKey,
      summary: item.summary
    };
  } catch (error: any) {
    logger.error(`[PDF Worker] Error processing item ${item.title}: ${error.message}`);
    return { errorMsg: `Error processing ${item.title}: ${error.message}` };
  }
}

export async function processBackgroundDelivery(payload: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  digitalItems: DeliveryItem[];
  physicalItems: any[];
  date: string;
}) {
  logger.info(`[PDF Worker] Starting background PDF delivery for order ${payload.orderId}`);
  
  const buyer: BuyerDetails = {
    name: payload.customerName,
    email: payload.customerEmail,
    phone: payload.customerPhone,
    orderRef: payload.orderId,
    date: payload.date,
  };

  const deliveryPromises = payload.digitalItems.map(item => processItem(item, buyer));
  const deliveredPdfsNullable = await Promise.all(deliveryPromises);
  const deliveredPdfs = deliveredPdfsNullable.filter((pdf): pdf is DeliveredPdf => !('errorMsg' in pdf));
  const failedPdfs = deliveredPdfsNullable.filter(pdf => 'errorMsg' in pdf);
  const errorDetails = failedPdfs.map(f => (f as any).errorMsg).join(' | ');

  const hasFailedDigitalItems = payload.digitalItems.length > 0 && deliveredPdfs.length < payload.digitalItems.length;

  if (deliveredPdfs.length > 0) {
    const { error } = await supabaseAdmin
      .from("mt_orders")
      .update({ 
        pdf_delivered: true, 
        pdf_urls: deliveredPdfs.map(i => ({ title: i.title, url: i.downloadUrl, s3Key: i.s3Key }))
      })
      .eq("id", payload.orderId);
      
    if (error) {
      logger.error(`[PDF Worker] Failed to update order URLs in DB for ${payload.orderId}: ${error.message}`);
    }
  }

  try {
    const emailResult = await sendConfirmationEmail(
      payload.customerEmail,
      `Your MediTonic Order #${payload.orderId.slice(0, 8)}`,
      Template_StoreProductDelivery(
        payload.customerName, 
        payload.orderId, 
        deliveredPdfs, 
        payload.physicalItems, 
        hasFailedDigitalItems,
        errorDetails
      )
    );
    if (!emailResult.success) {
      logger.error(`[PDF Worker] Failed to send email for order ${payload.orderId}. Error:`, emailResult.error);
    } else {
      logger.info(`[PDF Worker] Delivery email sent successfully for order ${payload.orderId}.`);
    }
  } catch (emailErr: any) {
    logger.error(`[PDF Worker] Exception sending email for order ${payload.orderId}: ${emailErr.message}`);
  }
}
