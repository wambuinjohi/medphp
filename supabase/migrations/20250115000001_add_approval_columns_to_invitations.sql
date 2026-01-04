-- Add approval tracking columns to user_invitations table
ALTER TABLE user_invitations
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on approved invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_is_approved ON user_invitations(is_approved);
CREATE INDEX IF NOT EXISTS idx_user_invitations_approved_by ON user_invitations(approved_by);

-- Log this migration
INSERT INTO migration_logs (migration_name, notes, status)
VALUES (
    'add_approval_columns_to_invitations',
    'Added is_approved, approved_by, and approved_at columns to user_invitations table for tracking admin approvals.',
    'completed'
) ON CONFLICT DO NOTHING;
