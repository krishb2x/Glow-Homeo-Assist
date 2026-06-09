/**
 * scripts/seed-s3.ts
 * Generates dummy PDFs with the "MEDITONIC" password and uploads them
 * to the exact S3 paths required by the delivery service.
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env vars from root .env
config({ path: resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.AWS_S3_BUCKET_NAME!;
const REGION = process.env.AWS_REGION || 'eu-north-1';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function createDummyPdf(title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  
  page.drawText(`MASTER EBOOK FILE`, {
    x: 50,
    y: 700,
    size: 24,
    font,
    color: rgb(0.1, 0.4, 0.3)
  });

  page.drawText(`Title: ${title}`, {
    x: 50,
    y: 650,
    size: 16,
    font,
  });

  page.drawText(`This is a dummy PDF seeded automatically.`, {
    x: 50,
    y: 600,
    size: 14,
    font,
  });

  // Note: pdf-lib cannot actually apply password encryption when saving.
  // It can only decrypt when loading. To fully simulate an encrypted file, we would need 
  // an external CLI like qpdf or a different library. But we'll save it unencrypted for now
  // since watermark.ts uses `ignoreEncryption: true` and will handle both encrypted and unencrypted files.
  // The Admin uploads encrypted PDFs in production.

  return await doc.save();
}

async function seedS3() {
  console.log('Fetching EBOOK products from Supabase...');
  
  const { data: products, error } = await supabase
    .from('mt_products')
    .select('id, title, slug, product_type')
    .in('product_type', ['EBOOK', 'COURSE']);

  if (error) {
    console.error('Failed to fetch products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No ebooks found.');
    return;
  }

  console.log(`Found ${products.length} ebooks. Seeding AWS S3...`);

  for (const product of products) {
    try {
      if (!product.slug) {
        console.warn(`Skipping ${product.title} - No slug found.`);
        continue;
      }

      const dummyPdfBytes = await createDummyPdf(product.title);
      
      const docName = 'dr-aman-agarwal';
      const key = `store-items/by-doctor/${docName}/ebooks/originals/${product.slug}/${product.slug}.pdf`;

      console.log(`Uploading ${product.title} to s3://${BUCKET}/${key}`);
      
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: Buffer.from(dummyPdfBytes),
        ContentType: 'application/pdf',
      }));

      // Update the mt_products database to reflect it's managed by S3
      await supabase
        .from('mt_products')
        .update({ final_pdf_path: 'aws-s3-managed' })
        .eq('id', product.id);

      console.log(`✅ Success for ${product.title}`);
    } catch (err) {
      console.error(`❌ Failed to seed ${product.title}:`, err);
    }
  }

  console.log('Seeding complete.');
}

seedS3();
