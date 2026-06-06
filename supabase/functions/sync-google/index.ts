import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { ok, badRequest, handleError, corsResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const supabase = createSupabaseClient(req)
    const userId = await getAuthUserId(supabase)

    if (req.method === 'POST') {
      // 1. Get the Google connection for this user
      const { data: connection, error: connError } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle()

      if (connError) throw connError
      if (!connection) return badRequest('Google account not connected')

      // Token refresh logic should go here if token is expired...
      const accessToken = connection.access_token

      // 2. Fetch calendars (Sync logic placeholder for Phase 1)
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!calRes.ok) throw new Error('Failed to fetch Google Calendars')
      const calendarData = await calRes.json()

      // 3. For each calendar, fetch events and upsert into the database
      let syncedEventsCount = 0
      for (const item of calendarData.items) {
        // Upsert the calendar in Sequent
        const { data: cal, error: calUpsertError } = await supabase
          .from('calendars')
          .upsert({
            user_id: userId,
            provider: 'google',
            external_id: item.id,
            name: item.summary,
            color: item.backgroundColor || '#4285F4',
            etag: item.etag
          }, { onConflict: 'id' }) // Ideally we'd map via external_id, but keeping simple for demo
          .select('id')
          .single()

        if (calUpsertError && calUpsertError.code !== '23505') { // Ignore duplicate key if any
            // proceed or handle
        }

        const now = new Date()
        const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()
        const timeMax = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
        
        const queryParams = new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          maxResults: '2500'
        })

        const eventsRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(item.id)}/events?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          
          for (const gevent of eventsData.items) {
             const isAllDay = !!gevent.start?.date
             const startTime = gevent.start?.dateTime || gevent.start?.date || new Date().toISOString()
             const endTime = gevent.end?.dateTime || gevent.end?.date || new Date().toISOString()
             
             // Mapping Google Event to our Schema
             const { error: eventError } = await supabase
              .from('events')
              .upsert({
                user_id: userId,
                // calendar_id: cal?.id, // Should link to the internal DB ID of the calendar
                external_id: gevent.id,
                etag: gevent.etag,
                title: gevent.summary || 'Untitled Event',
                description: gevent.description,
                location: gevent.location,
                start_time: startTime,
                end_time: endTime,
                is_all_day: isAllDay,
                status: gevent.status,
                html_link: gevent.htmlLink,
                updated_at: gevent.updated || new Date().toISOString()
              }, { onConflict: 'id' })
              
              if (!eventError) syncedEventsCount++
          }
        }
      }
      // 4. Fetch Google Task Lists
      const taskListsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      let syncedTasksCount = 0
      if (taskListsRes.ok) {
        const taskListsData = await taskListsRes.json()
        
        for (const tlist of (taskListsData.items || [])) {
          // Upsert the task list
          const { data: listData, error: listUpsertError } = await supabase
            .from('lists')
            .upsert({
              user_id: userId,
              provider: 'google',
              external_id: tlist.id,
              name: tlist.title,
              etag: tlist.etag,
              updated_at: tlist.updated || new Date().toISOString()
            }, { onConflict: 'user_id, external_id', ignoreDuplicates: false })
            .select('id')
            .maybeSingle()
            
          const localListId = listData?.id
          
          if (localListId) {
            // Fetch tasks for this list
            const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(tlist.id)}/tasks?maxResults=100`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
            
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json()
              
              for (const gtask of (tasksData.items || [])) {
                // Upsert the task
                const { error: taskError } = await supabase
                  .from('tasks')
                  .upsert({
                    user_id: userId,
                    list_id: localListId,
                    provider: 'google',
                    external_id: gtask.id,
                    etag: gtask.etag,
                    title: gtask.title || 'Untitled Task',
                    notes: gtask.notes || '',
                    status: gtask.status === 'completed' ? 'completed' : 'pending',
                    due_date: gtask.due ? new Date(gtask.due).toISOString() : null,
                    updated_at: gtask.updated || new Date().toISOString()
                  }, { onConflict: 'user_id, external_id', ignoreDuplicates: false })
                  
                if (!taskError) syncedTasksCount++
              }
            }
          }
        }
      }

      return ok({ success: true, message: `Successfully synced ${syncedEventsCount} events and ${syncedTasksCount} tasks` })
    }

    return badRequest('Invalid method')
  } catch (err) {
    return handleError(err)
  }
})
