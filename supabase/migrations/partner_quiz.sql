-- Add partner quiz answers column to partner_profiles
-- Stores the raw Q&A pairs from the partner perception quiz.

ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS quiz_answers jsonb DEFAULT NULL;

-- Track who this profile describes (null = unlinked partner described by owner)
-- When a partnership is linked, this should match the partner's user id.
ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS about_user_id uuid DEFAULT NULL REFERENCES auth.users(id);

COMMENT ON COLUMN partner_profiles.quiz_answers IS 'Raw Q&A pairs from the partner perception quiz, JSON array of {question, answer, section}';
COMMENT ON COLUMN partner_profiles.about_user_id IS 'The user this profile describes. NULL = unlinked partner.';
