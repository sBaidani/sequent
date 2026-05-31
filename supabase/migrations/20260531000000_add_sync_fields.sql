-- Add new columns to existing tables
ALTER TABLE public.lists 
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN sync_version INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE public.tasks 
  ADD COLUMN priority TEXT DEFAULT 'normal',
  ADD COLUMN notes TEXT,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN sync_version INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE public.calendars 
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN sync_version INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE public.events 
  ADD COLUMN alert_minutes INTEGER,
  ADD COLUMN recurrence_rule TEXT,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN sync_version INTEGER DEFAULT 1 NOT NULL;
