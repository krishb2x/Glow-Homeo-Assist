const fs = require('fs');

const csv = `0c56620f-10da-488d-8e64-a0c90f35456f,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The CT Scan Book,"Everything about CT scan reports — chest, abdomen, head, and spine. Understand what your radiologist is saying.",150.00,215.00,diagnostic,,https://placehold.co/400x520/064E3B/ffffff?text=CT+Scan+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 195, ""format"": ""PDF"", ""language"": ""English""}",3,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
15f87344-fac2-4f32-a1b6-ed260f38cb6f,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Common Medicine Book,"Quick reference for the most commonly prescribed medicines — indications, doses, side effects, and patient counselling.",150.00,215.00,medicine,,https://placehold.co/400x520/064E3B/ffffff?text=Common+Medicine+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 165, ""format"": ""PDF"", ""language"": ""English""}",14,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
28ad0052-daf4-4673-90db-b803454c9ecc,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The X-Ray Book,"Beginner-friendly guide to reading X-ray reports for chest, bones, and joints. Includes common findings and clinical significance.",150.00,215.00,diagnostic,,https://placehold.co/400x520/064E3B/ffffff?text=X-Ray+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 150, ""format"": ""PDF"", ""language"": ""English""}",4,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
3ccbab86-7647-4785-bd4c-2a5eab8be13d,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The Triple Bundle — All 3 Combos,"The complete collection: All 15 books across Diagnostic, Gyne & Pedia, and Medicine. Best value — save ₹650 vs buying combos separately.",1500.00,2150.00,combo,,https://placehold.co/600x400/F59E0B/ffffff?text=Triple+Bundle,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""books"": 15, ""format"": ""PDF"", ""language"": ""English""}",19,true,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
40a681a7-392f-4088-bc31-66ade1888401,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Combo 1 — Diagnostic Bundle,"All 5 Diagnostic books in one pack: Ultrasound, MRI, CT Scan, X-Ray, and Lab Test. Save ₹301 vs buying individually.",699.00,1000.00,combo,,https://placehold.co/600x400/064E3B/ffffff?text=Diagnostic+Bundle,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""books"": 5, ""format"": ""PDF"", ""language"": ""English""}",20,true,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
4a912645-f3d8-4590-9ad3-96e554d71a77,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Combo 4 — Hard Copy Collection,Physical printed copies of all books delivered to your doorstep. Premium quality print on demand.,1000.00,1430.00,combo,,https://placehold.co/600x400/064E3B/ffffff?text=Hard+Copy+Collection,,,,"{""format"": ""Hard Copy"", ""delivery"": ""Pan India""}",23,true,[],out_of_stock,,true,true,2026-04-14 01:10:38.577243+00
5493eabc-00c0-416c-9512-b6aef83f2b41,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The Pedia Clinical Book,Clinical paediatrics — case-based approach to diagnosis and management of common childhood conditions.,150.00,215.00,gyne_pedia,,https://placehold.co/400x520/064E3B/ffffff?text=Pedia+Clinical+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 190, ""format"": ""PDF"", ""language"": ""English""}",9,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
62b459e9-37c7-4464-8ef9-3e219563721e,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The Pedia Book,"Paediatric essentials — growth milestones, common childhood illnesses, vaccinations, and when to refer.",150.00,215.00,gyne_pedia,,https://placehold.co/400x520/064E3B/ffffff?text=Pedia+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 185, ""format"": ""PDF"", ""language"": ""English""}",7,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
66c6e588-8927-4320-a77b-bfcf221ad44b,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Medicine Book,"Core internal medicine — systematic approach to common medical conditions, diagnosis, and treatment.",150.00,215.00,medicine,,https://placehold.co/400x520/064E3B/ffffff?text=Medicine+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 260, ""format"": ""PDF"", ""language"": ""English""}",10,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
7a414518-9d02-48fe-b5d9-52cf71191690,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The Ultrasound Book,"A complete guide to understanding ultrasound reports — abdomen, pelvis, thyroid, and more. Written in plain language for patients and students.",150.00,215.00,diagnostic,,https://placehold.co/400x520/064E3B/ffffff?text=Ultrasound+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 180, ""format"": ""PDF"", ""language"": ""English""}",1,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
7bb2a62f-69f9-4eaa-979b-31955f54b198,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The Gyne Clinical Book,"Clinical approach to gynaecological cases — history taking, examination, investigations, and management protocols.",150.00,215.00,gyne_pedia,,https://placehold.co/400x520/064E3B/ffffff?text=Gyne+Clinical+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 175, ""format"": ""PDF"", ""language"": ""English""}",8,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
8e88dc1a-0804-4d30-8eb6-47318d705c88,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Combo 3 — Medicine Bundle,"All 6 Medicine books: Medicine, Prescription, Procedure, Injection, Common Medicine, and General Practice.",500.00,715.00,combo,,https://placehold.co/600x400/064E3B/ffffff?text=Medicine+Bundle,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""books"": 6, ""format"": ""PDF"", ""language"": ""English""}",22,true,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
a497c3ea-adc6-44d7-a379-f9d00e7647e7,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Procedure Book,"Step-by-step guide to common clinical procedures — IV cannulation, catheterisation, wound care, and more.",150.00,215.00,medicine,,https://placehold.co/400x520/064E3B/ffffff?text=Procedure+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 155, ""format"": ""PDF"", ""language"": ""English""}",12,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
ac5e5c4d-2222-40a5-af4e-426b95be5d0a,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The MRI Book,"Decode MRI reports with confidence — brain, spine, knee, shoulder, and abdomen. Covers normal findings vs red flags.",150.00,215.00,diagnostic,,https://placehold.co/400x520/064E3B/ffffff?text=MRI+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 210, ""format"": ""PDF"", ""language"": ""English""}",2,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
ba8a7cb5-b8d0-4251-be64-0be9620e3a6b,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Injection Book,"Complete injection guide — routes, sites, techniques, drug compatibility, and emergency injection protocols.",150.00,215.00,medicine,,https://placehold.co/400x520/064E3B/ffffff?text=Injection+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 140, ""format"": ""PDF"", ""language"": ""English""}",13,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
c9a475cf-1943-4804-84c3-0bc23240bd30,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The Lab Test Book,"Understand blood reports, urine tests, thyroid panels, LFT, KFT, and more. Know your numbers and what action to take.",150.00,215.00,diagnostic,,https://placehold.co/400x520/064E3B/ffffff?text=Lab+Test+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 220, ""format"": ""PDF"", ""language"": ""English""}",5,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
cd15f72e-a38c-4972-91da-ff873695354d,1b4b8c67-6730-4afa-b045-a4a90424059b,book,The Gyne & Obs Book,"Comprehensive guide to gynaecology and obstetrics — antenatal care, common gyne conditions, and investigations explained.",150.00,215.00,gyne_pedia,,https://placehold.co/400x520/064E3B/ffffff?text=Gyne+%26+Obs+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 200, ""format"": ""PDF"", ""language"": ""English""}",6,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
cf315cd5-30fc-4030-9d4b-4674d38ec7bd,1b4b8c67-6730-4afa-b045-a4a90424059b,book,General Practice Book,"The complete general practice handbook — OPD management, triage, referral criteria, and day-to-day clinical decision making.",150.00,215.00,medicine,,https://placehold.co/400x520/064E3B/ffffff?text=General+Practice+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 240, ""format"": ""PDF"", ""language"": ""English""}",15,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
eba66df4-f20e-4821-bc7d-5241928fc7b4,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Prescription Book,"Practical prescribing guide — drug doses, combinations, contraindications, and prescription writing for common conditions.",150.00,215.00,medicine,,https://placehold.co/400x520/064E3B/ffffff?text=Prescription+Book,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""pages"": 170, ""format"": ""PDF"", ""language"": ""English""}",11,false,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00
f85135b3-7690-421c-84b8-782adfaac8c1,1b4b8c67-6730-4afa-b045-a4a90424059b,book,Combo 2 — Gyne & Pedia Bundle,"All 4 Gyne & Pedia books: Gyne & Obs, Pedia, Gyne Clinical, and Pedia Clinical. Complete women and child health reference.",699.00,1000.00,combo,,https://placehold.co/600x400/064E3B/ffffff?text=Gyne+%26+Pedia+Bundle,,,https://www.youtube.com/embed/tCuzdBTglEU,"{""books"": 4, ""format"": ""PDF"", ""language"": ""English""}",21,true,[],in_stock,,true,true,2026-04-14 01:10:38.577243+00`;

const rows = csv.trim().split('\n');

const escapeStr = (str) => {
  if (!str) return 'NULL';
  // handle double quotes from CSV
  const unquoted = str.startsWith('"') && str.endsWith('"') ? str.slice(1, -1).replace(/""/g, '"') : str;
  return "'" + unquoted.replace(/'/g, "''") + "'";
};

const escapeNum = (num) => {
  if (!num) return 'NULL';
  return num;
};

const CLINIC_ID = '00000000-0000-0000-0000-000000000001';

const toSlug = (title) => {
  let clean = title.replace(/^The /i, '');
  clean = clean.replace(/ — .*$/, ''); // remove dash and after
  return clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const inserts = rows.map(row => {
  // Regex to parse CSV properly handling quotes
  const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
  // Split correctly:
  const cols = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') {
      inQuotes = !inQuotes;
      current += '"';
    } else if (row[i] === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += row[i];
    }
  }
  cols.push(current);

  const [
    id, doctor_id, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active, created_at
  ] = cols;

  const slug = toSlug(title.startsWith('"') ? title.slice(1,-1) : title);

  // We are going to replace mt_ebooks to have these new columns.
  // We need to write an ALTER TABLE statement first.

  return `INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '${id}', '${CLINIC_ID}', '${slug}', ${escapeStr(type)}, ${escapeStr(title)}, ${escapeStr(description)}, ${price}, ${escapeNum(original_price)}, ${escapeStr(category)}, ${escapeStr(badge)}, ${escapeStr(image_url)}, ${escapeStr(image_url_2)}, ${escapeStr(image_url_3)}, ${escapeStr(video_url)}, ${escapeStr(metadata)}::jsonb, ${sort_order}, ${is_combo}, '${combo_includes}'::jsonb, ${escapeStr(stock_status)}, ${escapeStr(s3_key)}, ${auto_deliver}, ${is_active}
  ) ON CONFLICT (id) DO NOTHING;`;
});

const sql = `
-- Migration: Add E-commerce specific columns to mt_ebooks and seed data

-- 1. Alter Table
ALTER TABLE mt_ebooks 
  RENAME COLUMN cover_image_url TO image_url;

ALTER TABLE mt_ebooks
  ADD COLUMN type TEXT DEFAULT 'book',
  ADD COLUMN original_price NUMERIC(10,2),
  ADD COLUMN category TEXT,
  ADD COLUMN badge TEXT,
  ADD COLUMN image_url_2 TEXT,
  ADD COLUMN image_url_3 TEXT,
  ADD COLUMN video_url TEXT,
  ADD COLUMN metadata JSONB,
  ADD COLUMN sort_order INTEGER DEFAULT 0,
  ADD COLUMN is_combo BOOLEAN DEFAULT FALSE,
  ADD COLUMN combo_includes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN stock_status TEXT DEFAULT 'in_stock',
  ADD COLUMN s3_key TEXT,
  ADD COLUMN auto_deliver BOOLEAN DEFAULT TRUE;

-- 2. Clear existing dummy ebooks to avoid slug conflicts, we want the real ones
DELETE FROM mt_ebooks WHERE clinic_id = '${CLINIC_ID}';

-- 3. Insert real catalog
${inserts.join('\n')}
`;

fs.writeFileSync('d:/HomeoAssist/supabase/migrations/20260607000001_meditonic_store_v2.sql', sql);
console.log('Migration generated successfully.');
