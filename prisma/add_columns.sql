-- Add aspectRatio and upscale columns to Project table
-- Run this SQL directly on your PostgreSQL database

ALTER TABLE "Project" 
ADD COLUMN IF NOT EXISTS "aspectRatio" TEXT DEFAULT '1:1',
ADD COLUMN IF NOT EXISTS "upscale" TEXT DEFAULT 'Original';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Project';
