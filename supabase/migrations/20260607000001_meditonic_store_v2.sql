
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
DELETE FROM mt_ebooks WHERE clinic_id = '595cd444-e89c-4d1f-b31f-27f76f59e0d7';

-- 3. Insert real catalog
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '0c56620f-10da-488d-8e64-a0c90f35456f', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'ct-scan-book', 'book', 'The CT Scan Book', 'Everything about CT scan reports — chest, abdomen, head, and spine. Understand what your radiologist is saying.', 150.00, 215.00, 'diagnostic', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=CT+Scan+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 195, "format": "PDF", "language": "English"}'::jsonb, 3, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '15f87344-fac2-4f32-a1b6-ed260f38cb6f', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'common-medicine-book', 'book', 'Common Medicine Book', 'Quick reference for the most commonly prescribed medicines — indications, doses, side effects, and patient counselling.', 150.00, 215.00, 'medicine', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Common+Medicine+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 165, "format": "PDF", "language": "English"}'::jsonb, 14, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '28ad0052-daf4-4673-90db-b803454c9ecc', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'x-ray-book', 'book', 'The X-Ray Book', 'Beginner-friendly guide to reading X-ray reports for chest, bones, and joints. Includes common findings and clinical significance.', 150.00, 215.00, 'diagnostic', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=X-Ray+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 150, "format": "PDF", "language": "English"}'::jsonb, 4, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '3ccbab86-7647-4785-bd4c-2a5eab8be13d', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'triple-bundle', 'book', 'The Triple Bundle — All 3 Combos', 'The complete collection: All 15 books across Diagnostic, Gyne & Pedia, and Medicine. Best value — save ₹650 vs buying combos separately.', 1500.00, 2150.00, 'combo', NULL, 'https://placehold.co/600x400/F59E0B/ffffff?text=Triple+Bundle', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"books": 15, "format": "PDF", "language": "English"}'::jsonb, 19, true, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '40a681a7-392f-4088-bc31-66ade1888401', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'combo-1', 'book', 'Combo 1 — Diagnostic Bundle', 'All 5 Diagnostic books in one pack: Ultrasound, MRI, CT Scan, X-Ray, and Lab Test. Save ₹301 vs buying individually.', 699.00, 1000.00, 'combo', NULL, 'https://placehold.co/600x400/064E3B/ffffff?text=Diagnostic+Bundle', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"books": 5, "format": "PDF", "language": "English"}'::jsonb, 20, true, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '4a912645-f3d8-4590-9ad3-96e554d71a77', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'combo-4', 'book', 'Combo 4 — Hard Copy Collection', 'Physical printed copies of all books delivered to your doorstep. Premium quality print on demand.', 1000.00, 1430.00, 'combo', NULL, 'https://placehold.co/600x400/064E3B/ffffff?text=Hard+Copy+Collection', NULL, NULL, NULL, '{"format": "Hard Copy", "delivery": "Pan India"}'::jsonb, 23, true, '[]'::jsonb, 'out_of_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '5493eabc-00c0-416c-9512-b6aef83f2b41', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'pedia-clinical-book', 'book', 'The Pedia Clinical Book', 'Clinical paediatrics — case-based approach to diagnosis and management of common childhood conditions.', 150.00, 215.00, 'gyne_pedia', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Pedia+Clinical+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 190, "format": "PDF", "language": "English"}'::jsonb, 9, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '62b459e9-37c7-4464-8ef9-3e219563721e', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'pedia-book', 'book', 'The Pedia Book', 'Paediatric essentials — growth milestones, common childhood illnesses, vaccinations, and when to refer.', 150.00, 215.00, 'gyne_pedia', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Pedia+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 185, "format": "PDF", "language": "English"}'::jsonb, 7, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '66c6e588-8927-4320-a77b-bfcf221ad44b', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'medicine-book', 'book', 'Medicine Book', 'Core internal medicine — systematic approach to common medical conditions, diagnosis, and treatment.', 150.00, 215.00, 'medicine', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Medicine+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 260, "format": "PDF", "language": "English"}'::jsonb, 10, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '7a414518-9d02-48fe-b5d9-52cf71191690', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'ultrasound-book', 'book', 'The Ultrasound Book', 'A complete guide to understanding ultrasound reports — abdomen, pelvis, thyroid, and more. Written in plain language for patients and students.', 150.00, 215.00, 'diagnostic', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Ultrasound+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 180, "format": "PDF", "language": "English"}'::jsonb, 1, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '7bb2a62f-69f9-4eaa-979b-31955f54b198', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'gyne-clinical-book', 'book', 'The Gyne Clinical Book', 'Clinical approach to gynaecological cases — history taking, examination, investigations, and management protocols.', 150.00, 215.00, 'gyne_pedia', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Gyne+Clinical+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 175, "format": "PDF", "language": "English"}'::jsonb, 8, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    '8e88dc1a-0804-4d30-8eb6-47318d705c88', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'combo-3', 'book', 'Combo 3 — Medicine Bundle', 'All 6 Medicine books: Medicine, Prescription, Procedure, Injection, Common Medicine, and General Practice.', 500.00, 715.00, 'combo', NULL, 'https://placehold.co/600x400/064E3B/ffffff?text=Medicine+Bundle', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"books": 6, "format": "PDF", "language": "English"}'::jsonb, 22, true, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'a497c3ea-adc6-44d7-a379-f9d00e7647e7', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'procedure-book', 'book', 'Procedure Book', 'Step-by-step guide to common clinical procedures — IV cannulation, catheterisation, wound care, and more.', 150.00, 215.00, 'medicine', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Procedure+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 155, "format": "PDF", "language": "English"}'::jsonb, 12, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'ac5e5c4d-2222-40a5-af4e-426b95be5d0a', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'mri-book', 'book', 'The MRI Book', 'Decode MRI reports with confidence — brain, spine, knee, shoulder, and abdomen. Covers normal findings vs red flags.', 150.00, 215.00, 'diagnostic', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=MRI+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 210, "format": "PDF", "language": "English"}'::jsonb, 2, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'ba8a7cb5-b8d0-4251-be64-0be9620e3a6b', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'injection-book', 'book', 'Injection Book', 'Complete injection guide — routes, sites, techniques, drug compatibility, and emergency injection protocols.', 150.00, 215.00, 'medicine', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Injection+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 140, "format": "PDF", "language": "English"}'::jsonb, 13, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'c9a475cf-1943-4804-84c3-0bc23240bd30', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'lab-test-book', 'book', 'The Lab Test Book', 'Understand blood reports, urine tests, thyroid panels, LFT, KFT, and more. Know your numbers and what action to take.', 150.00, 215.00, 'diagnostic', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Lab+Test+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 220, "format": "PDF", "language": "English"}'::jsonb, 5, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'cd15f72e-a38c-4972-91da-ff873695354d', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'gyne-obs-book', 'book', 'The Gyne & Obs Book', 'Comprehensive guide to gynaecology and obstetrics — antenatal care, common gyne conditions, and investigations explained.', 150.00, 215.00, 'gyne_pedia', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Gyne+%26+Obs+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 200, "format": "PDF", "language": "English"}'::jsonb, 6, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'cf315cd5-30fc-4030-9d4b-4674d38ec7bd', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'general-practice-book', 'book', 'General Practice Book', 'The complete general practice handbook — OPD management, triage, referral criteria, and day-to-day clinical decision making.', 150.00, 215.00, 'medicine', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=General+Practice+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 240, "format": "PDF", "language": "English"}'::jsonb, 15, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'eba66df4-f20e-4821-bc7d-5241928fc7b4', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'prescription-book', 'book', 'Prescription Book', 'Practical prescribing guide — drug doses, combinations, contraindications, and prescription writing for common conditions.', 150.00, 215.00, 'medicine', NULL, 'https://placehold.co/400x520/064E3B/ffffff?text=Prescription+Book', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"pages": 170, "format": "PDF", "language": "English"}'::jsonb, 11, false, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO mt_ebooks (
    id, clinic_id, slug, type, title, description, price, original_price, category, badge, image_url, image_url_2, image_url_3, video_url, metadata, sort_order, is_combo, combo_includes, stock_status, s3_key, auto_deliver, is_active
  ) VALUES (
    'f85135b3-7690-421c-84b8-782adfaac8c1', '595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'combo-2', 'book', 'Combo 2 — Gyne & Pedia Bundle', 'All 4 Gyne & Pedia books: Gyne & Obs, Pedia, Gyne Clinical, and Pedia Clinical. Complete women and child health reference.', 699.00, 1000.00, 'combo', NULL, 'https://placehold.co/600x400/064E3B/ffffff?text=Gyne+%26+Pedia+Bundle', NULL, NULL, 'https://www.youtube.com/embed/tCuzdBTglEU', '{"books": 4, "format": "PDF", "language": "English"}'::jsonb, 21, true, '[]'::jsonb, 'in_stock', NULL, true, true
  ) ON CONFLICT (id) DO NOTHING;
