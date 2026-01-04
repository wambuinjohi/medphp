-- Create variant_images table to support multiple images per variant
CREATE TABLE IF NOT EXISTS variant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES web_variants(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_variant_images_variant_id ON variant_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_images_display_order ON variant_images(display_order);

-- Enable RLS
ALTER TABLE variant_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for variant_images - Allow everyone full access
CREATE POLICY "Allow all access to variant_images" ON variant_images
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON variant_images TO anon;
GRANT ALL ON variant_images TO authenticated;
