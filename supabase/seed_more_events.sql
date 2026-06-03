DO $$
DECLARE
  v_user_id UUID;
  v_calendar_id_meetings UUID;
  v_calendar_id_deepwork UUID;
  v_list_id UUID;
  d DATE;
  day_offset INT;
  num_events INT;
  event_hour INT;
  duration_minutes INT;
  event_start TIMESTAMP WITH TIME ZONE;
  event_end TIMESTAMP WITH TIME ZONE;
  i INT;
  title TEXT;
  meeting_titles TEXT[] := ARRAY['Design Sync', 'Standup', 'Client Catchup', 'Project Kickoff', '1:1', 'Code Review', 'Planning Session', 'Vendor Call', 'All Hands', 'Architecture Review'];
  focus_titles TEXT[] := ARRAY['Feature Work', 'Bug Fixing', 'Writing Docs', 'Research', 'Learning', 'Refactoring', 'Deep Dive', 'Inbox Zero', 'Planning', 'Reviewing PRs'];
  task_titles TEXT[] := ARRAY['Send weekly report', 'Review mockups', 'Reply to emails', 'Update dependencies', 'Pay bills', 'Prepare slides', 'Order supplies', 'Write tests', 'Deploy to staging', 'Fix typos'];
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sadiq@baidani.tech';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.calendars (user_id, provider, name, color)
  VALUES (v_user_id, 'local', 'High Density Meetings', '#E74C3C')
  RETURNING id INTO v_calendar_id_meetings;

  INSERT INTO public.calendars (user_id, provider, name, color)
  VALUES (v_user_id, 'local', 'Deep Work', '#8E44AD')
  RETURNING id INTO v_calendar_id_deepwork;

  INSERT INTO public.lists (user_id, name, color, icon)
  VALUES (v_user_id, 'Next 4 Weeks Goals', '#F39C12', 'star')
  RETURNING id INTO v_list_id;

  FOR day_offset IN 0..27 LOOP
    d := CURRENT_DATE + day_offset;

    -- 4 to 8 events for weekdays, 1 to 2 for weekends
    IF extract(isodow from d) < 6 THEN
      num_events := 4 + floor(random() * 5); 
    ELSE
      num_events := 1 + floor(random() * 2); 
    END IF;

    FOR i IN 1..num_events LOOP
      event_hour := 8 + floor(random() * 10); -- 8 AM to 5 PM
      duration_minutes := 30 + floor(random() * 90); -- 30 to 119 minutes
      
      event_start := (d + make_interval(hours := event_hour)) AT TIME ZONE 'UTC';
      event_end := event_start + make_interval(mins := duration_minutes);

      IF random() > 0.4 THEN
        title := meeting_titles[1 + floor(random() * array_length(meeting_titles, 1))];
        INSERT INTO public.events (user_id, calendar_id, title, start_time, end_time, location)
        VALUES (v_user_id, v_calendar_id_meetings, title, event_start, event_end, 'Online');
      ELSE
        title := focus_titles[1 + floor(random() * array_length(focus_titles, 1))];
        INSERT INTO public.events (user_id, calendar_id, title, start_time, end_time, location)
        VALUES (v_user_id, v_calendar_id_deepwork, title, event_start, event_end, 'Office');
      END IF;
    END LOOP;

    -- Add 1 to 3 tasks per day
    FOR i IN 1..(1 + floor(random() * 3)) LOOP
        title := task_titles[1 + floor(random() * array_length(task_titles, 1))];
        INSERT INTO public.tasks (user_id, list_id, title, status, due_date)
        VALUES (v_user_id, v_list_id, title, 'pending', d);
    END LOOP;

  END LOOP;
END $$;
