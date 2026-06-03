-- Migration: Add Calendar Integration Fields
-- Impact Analysis: Adding new nullable or default columns to existing tables is a non-destructive, backwards-compatible operation.
-- Existing application queries (which currently don't heavily rely on the 'events' table yet) will continue to function without interruption.

-- Add missing columns to `calendars`
ALTER TABLE public.calendars
  ADD COLUMN IF NOT EXISTS etag TEXT;

-- Add missing columns to `events`
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS etag TEXT,
  ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_timezone TEXT,
  ADD COLUMN IF NOT EXISTS end_timezone TEXT,
  ADD COLUMN IF NOT EXISTS series_master_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS original_start_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS free_busy_status TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT,
  ADD COLUMN IF NOT EXISTS html_link TEXT,
  ADD COLUMN IF NOT EXISTS organizer JSONB,
  ADD COLUMN IF NOT EXISTS attendees JSONB,
  ADD COLUMN IF NOT EXISTS alerts JSONB;
