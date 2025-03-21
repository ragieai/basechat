-- Generate slugs for existing tenants based on their names
UPDATE tenants
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Create an index on the slug column for faster lookups
CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);

-- Update any existing users to have the authenticated type
-- This is a safety measure, though the default value should have handled this
UPDATE users 
SET type = 'authenticated'::user_type 
WHERE type IS NULL; 