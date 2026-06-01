-- Set default user_id to auth.uid() for automatic tenancy mapping on client insert
ALTER TABLE public.lists ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.calendars ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.events ALTER COLUMN user_id SET DEFAULT auth.uid();
