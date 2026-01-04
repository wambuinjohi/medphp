-- Web Manager Tables - Public Interface Management
-- These tables are completely independent and manage the public-facing website content

-- Create web_categories table
CREATE TABLE IF NOT EXISTS web_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create web_variants table
CREATE TABLE IF NOT EXISTS web_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES web_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  image_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(category_id, sku)
);

-- Create indexes for better query performance
CREATE INDEX idx_web_categories_slug ON web_categories(slug);
CREATE INDEX idx_web_categories_is_active ON web_categories(is_active);
CREATE INDEX idx_web_categories_display_order ON web_categories(display_order);
CREATE INDEX idx_web_variants_category_id ON web_variants(category_id);
CREATE INDEX idx_web_variants_slug ON web_variants(slug);
CREATE INDEX idx_web_variants_sku ON web_variants(sku);
CREATE INDEX idx_web_variants_is_active ON web_variants(is_active);
CREATE INDEX idx_web_variants_category_display ON web_variants(category_id, display_order);

-- Enable RLS (Row Level Security)
ALTER TABLE web_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read access to active categories and variants
CREATE POLICY "Allow public read web_categories" 
  ON web_categories FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Allow public read web_variants" 
  ON web_variants FOR SELECT 
  USING (is_active = true);

-- RLS Policies: Allow authenticated admin users to manage
CREATE POLICY "Allow admin manage web_categories" 
  ON web_categories FOR ALL 
  USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND 
      raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Allow admin manage web_variants" 
  ON web_variants FOR ALL 
  USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND 
      raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insert default categories from existing data
INSERT INTO web_categories (name, slug, icon, description, display_order, is_active) VALUES
  ('Bandages, Tapes and Dressings', 'bandages-tapes-and-dressings', '🩹', 'Complete range of medical dressings and bandages for wound care', 1, true),
  ('Bottles and Containers', 'bottles-and-containers', '🧴', 'Sterile containers for specimen collection and storage', 2, true),
  ('Catheters and Tubes', 'catheters-and-tubes', '💉', 'Medical-grade catheters and tubing systems', 3, true),
  ('Cotton Wool', 'cotton-wool', '☁️', 'High-quality absorbent cotton products', 4, true),
  ('Diapers and Sanitary', 'diapers-and-sanitary', '👶', 'Adult and pediatric incontinence products', 5, true),
  ('Gloves', 'gloves', '🧤', 'Medical examination and surgical gloves', 6, true),
  ('Hospital Equipments', 'hospital-equipments', '🏥', 'Advanced medical equipment and monitors', 7, true),
  ('Hospital Furniture', 'hospital-furniture', '🛏️', 'Hospital beds, trolleys, and medical furniture', 8, true),
  ('Hospital Instruments', 'hospital-instruments', '⚕️', 'Surgical and diagnostic instruments', 9, true),
  ('Hospital Linen', 'hospital-linen', '🧺', 'Medical-grade sheets, pillows, and linens', 10, true),
  ('Infection Control', 'infection-control', '🛡️', 'Disinfectants, sanitizers, and safety equipment', 11, true),
  ('Others', 'others', '📦', 'Additional medical supplies and accessories', 12, true),
  ('PPE', 'ppe', '🦺', 'Personal protective equipment and safety gear', 13, true),
  ('Spirits, Detergents and Disinfectants', 'spirits-detergents-and-disinfectants', '🧼', 'Cleaning and sterilization products', 14, true),
  ('Syringes and Needles', 'syringes-and-needles', '💊', 'Sterile syringes and hypodermic needles', 15, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert default variants
INSERT INTO web_variants (category_id, name, slug, sku, description, image_url, display_order, is_active)
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'cotton-wool'),
  'Cotton Wool -50Gms Net Kings',
  'cotton-wool-50gms',
  'CW-050',
  'Pure cotton wool 50gms',
  '/products/cotton-wool-50gms.jpg',
  1,
  true
UNION ALL
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'cotton-wool'),
  'Cotton Wool -500Gms Net Kings',
  'cotton-wool-500gms',
  'CW-500',
  'Pure cotton wool 500gms',
  '/products/cotton-wool-500gms.jpg',
  2,
  true
UNION ALL
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'cotton-wool'),
  'Cotton Wool -400Gms Net Kings',
  'cotton-wool-400gms',
  'CW-400',
  'Pure cotton wool 400gms',
  '/products/cotton-wool-400gms.jpg',
  3,
  true
UNION ALL
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'cotton-wool'),
  'Cotton Wool -1kg Roll',
  'cotton-wool-1kg',
  'CW-1KG',
  'Pure cotton wool 1kg roll',
  '/products/cotton-wool-1kg.jpg',
  4,
  true
UNION ALL
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'gloves'),
  'Latex Examination Gloves',
  'latex-examination-gloves',
  'GLV-001',
  'Medical latex examination gloves',
  '/products/latex-gloves.jpg',
  1,
  true
UNION ALL
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'gloves'),
  'Nitrile Gloves',
  'nitrile-gloves',
  'GLV-002',
  'Latex-free nitrile gloves',
  '/products/nitrile-gloves.jpg',
  2,
  true
UNION ALL
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'gloves'),
  'Surgical Gloves',
  'surgical-gloves',
  'GLV-003',
  'Sterile surgical gloves',
  '/products/surgical-gloves.jpg',
  3,
  true
UNION ALL
SELECT 
  (SELECT id FROM web_categories WHERE slug = 'gloves'),
  'Vinyl Gloves',
  'vinyl-gloves',
  'GLV-004',
  'Vinyl examination gloves',
  '/products/vinyl-gloves.jpg',
  4,
  true
ON CONFLICT (sku) DO NOTHING;

-- Create view for easy access to categories with variant counts
CREATE OR REPLACE VIEW web_categories_with_counts AS
SELECT 
  c.id,
  c.name,
  c.slug,
  c.icon,
  c.description,
  c.display_order,
  c.is_active,
  c.created_at,
  c.updated_at,
  COUNT(v.id) as variant_count
FROM web_categories c
LEFT JOIN web_variants v ON c.id = v.category_id AND v.is_active = true
GROUP BY c.id, c.name, c.slug, c.icon, c.description, c.display_order, c.is_active, c.created_at, c.updated_at;

-- Grant permissions
GRANT SELECT ON web_categories TO anon;
GRANT SELECT ON web_variants TO anon;
GRANT ALL ON web_categories TO authenticated;
GRANT ALL ON web_variants TO authenticated;
GRANT SELECT ON web_categories_with_counts TO anon;
GRANT SELECT ON web_categories_with_counts TO authenticated;
