-- Migration: Add Tasks Integration Fields
-- Add external tracking fields to support one-way read-only sync from Google and Microsoft tasks.

ALTER TABLE public.lists
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS etag TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD CONSTRAINT lists_external_id_unique UNIQUE NULLS NOT DISTINCT (user_id, external_id);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS etag TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE,
  ADD CONSTRAINT tasks_external_id_unique UNIQUE NULLS NOT DISTINCT (user_id, external_id);
