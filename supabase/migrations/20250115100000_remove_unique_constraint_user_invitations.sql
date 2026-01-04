-- Remove the unique constraint on (email, company_id) from user_invitations
-- This allows multiple invitations for the same email in the same company
ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_email_company_id_key;
