-- Add primary_color field to companies table
-- Default to orange (#FF8C42)
ALTER TABLE companies 
ADD COLUMN primary_color VARCHAR(7) DEFAULT '#FF8C42';

-- Add comment to explain the field
COMMENT ON COLUMN companies.primary_color IS 'Brand primary color in hex format (e.g., #FF8C42). Used throughout the app for PDFs, UI, and branding.';

-- Ensure all existing records have the default value
UPDATE companies 
SET primary_color = '#FF8C42' 
WHERE primary_color IS NULL;
