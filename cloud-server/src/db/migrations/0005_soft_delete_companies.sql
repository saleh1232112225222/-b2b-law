-- Add soft delete columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Create index for faster queries on non-deleted companies
CREATE INDEX IF NOT EXISTS idx_companies_is_deleted ON companies(is_deleted);

-- Update existing queries to exclude soft-deleted companies by default
COMMENT ON COLUMN companies.is_deleted IS 'Soft delete flag - company is hidden but not removed';
COMMENT ON COLUMN companies.deleted_at IS 'Timestamp when soft delete was performed';
COMMENT ON COLUMN companies.deleted_by IS 'Admin user ID who performed the soft delete';
