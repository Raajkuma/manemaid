-- New role for the web portal's developer console (full agency rights + logs and live config).
-- Kept in its own migration: Postgres cannot use a new enum value in the same transaction
-- that adds it, and the next migration uses it in functions and policies.
alter type public.user_role add value if not exists 'developer';
