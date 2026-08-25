-- Step 1 of 2: add co_admin to user_role enum.
-- PostgreSQL requires this to be committed BEFORE any function/SQL uses 'co_admin'.
-- Run this file alone in Supabase SQL Editor, then run 017_co_admin_avatars.sql.

alter type public.user_role add value if not exists 'co_admin';
