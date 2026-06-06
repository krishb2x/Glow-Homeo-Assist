ALTER TABLE mt_consultation_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to mt_consultation_fees" ON mt_consultation_fees;
CREATE POLICY "Allow public read access to mt_consultation_fees" 
ON mt_consultation_fees FOR SELECT TO public USING (true);
