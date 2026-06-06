$sql = @"
DO $$
DECLARE
  v_user_id UUID;
  v_list_id UUID;
  v_calendar_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sadiq@baidani.tech';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.lists (user_id, name, color, icon)
  VALUES (v_user_id, 'Work', '#FF0000', 'briefcase')
  RETURNING id INTO v_list_id;

  INSERT INTO public.tasks (user_id, list_id, title, status, due_date)
  VALUES 
    (v_user_id, v_list_id, 'Finish quarterly report', 'pending', CURRENT_DATE + INTERVAL '2 days'),
    (v_user_id, v_list_id, 'Email client regarding new features', 'completed', CURRENT_DATE - INTERVAL '1 day'),
    (v_user_id, v_list_id, 'Prepare presentation slides', 'pending', CURRENT_DATE + INTERVAL '5 days');

  INSERT INTO public.lists (user_id, name, color, icon)
  VALUES (v_user_id, 'Personal', '#00FF00', 'home')
  RETURNING id INTO v_list_id;

  INSERT INTO public.tasks (user_id, list_id, title, status, due_date)
  VALUES
    (v_user_id, v_list_id, 'Buy groceries', 'pending', CURRENT_DATE),
    (v_user_id, v_list_id, 'Book flight for vacation', 'pending', CURRENT_DATE + INTERVAL '10 days');

  INSERT INTO public.calendars (user_id, provider, name, color)
  VALUES (v_user_id, 'local', 'Work Calendar', '#0000FF')
  RETURNING id INTO v_calendar_id;

  INSERT INTO public.events (user_id, calendar_id, title, start_time, end_time, location, notes)
  VALUES
    (v_user_id, v_calendar_id, 'Team Sync', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '1 hour', 'Zoom', 'Weekly sync'),
    (v_user_id, v_calendar_id, 'One on One with Manager', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '30 minutes', 'Office', 'Discuss performance'),
    (v_user_id, v_calendar_id, 'All Hands Meeting', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '2 hours', 'Main Hall', 'Company wide updates');
END $$;
"@

supabase db query $sql
