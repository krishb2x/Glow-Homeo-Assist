-- Enable RLS (if not already enabled)
ALTER TABLE mt_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Public can view active products" ON mt_products;
DROP POLICY IF EXISTS "Enable read access for all users" ON mt_products;

-- Create policy to allow public reads
CREATE POLICY "Enable read access for all users" 
ON mt_products FOR SELECT 
USING (true);
