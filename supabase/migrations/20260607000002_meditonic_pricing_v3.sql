-- Migration: Add mt_consultation_fees for dynamic backend pricing
-- Seeded with Clinic ID: 595cd444-e89c-4d1f-b31f-27f76f59e0d7

CREATE TABLE IF NOT EXISTS mt_consultation_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    type mt_consultation_type NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, type)
);

-- Seed Initial Prices
INSERT INTO mt_consultation_fees (clinic_id, type, label, description, price, original_price) VALUES 
('595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'initial_online', 'Initial Online Consultation', 'Comprehensive video consultation (45-60 mins). Detailed case taking, analysis, and constitutional remedy selection.', 499.00, 999.00),
('595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'initial_clinic', 'In-Clinic Consultation', 'Face-to-face consultation at our clinic. Includes physical examination and constitutional analysis.', 499.00, 999.00),
('595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'follow_up_online', 'Follow-up Consultation', 'Brief video/audio call (15-20 mins) to assess progress and modify treatment plan if necessary.', 299.00, 499.00),
('595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'emergency', 'Priority / Emergency', 'Skip the queue. Immediate response within 2 hours for acute conditions.', 999.00, 1499.00)
ON CONFLICT (clinic_id, type) DO UPDATE 
SET 
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- Enable RLS and add public read policy
ALTER TABLE mt_consultation_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to mt_consultation_fees" 
ON mt_consultation_fees FOR SELECT TO public USING (true);
