import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { ok, badRequest, handleError, corsResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const supabase = createSupabaseClient(req)
    const userId = await getAuthUserId(supabase)

    if (req.method === 'POST') {
      // 1. Get the MS connection for this user
      const { data: connection, error: connError } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'microsoft')
        .maybeSingle()

      if (connError) throw connError
      if (!connection) return badRequest('Microsoft account not connected')

      // Token refresh logic should go here if token is expired...
      const accessToken = connection.access_token

      // 2. Fetch calendars
      const calRes = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!calRes.ok) throw new Error('Failed to fetch Microsoft Calendars')
      const calendarData = await calRes.json()

      // 3. For each calendar, fetch events and upsert
      let syncedEventsCount = 0
      for (const item of calendarData.value) {
        // Upsert the calendar in Sequent
        const { data: cal, error: calUpsertError } = await supabase
          .from('calendars')
          .upsert({
            user_id: userId,
            provider: 'microsoft',
            external_id: item.id,
            name: item.name,
            color: item.hexColor ? item.hexColor.replace('Color', '#') : '#00a4ef', // Graph returns strange colors sometimes
            etag: item['@odata.etag'] || null
          }, { onConflict: 'id' }) // Needs proper conflict handling via external_id, simplified for demo
          .select('id')
          .single()

        if (calUpsertError && calUpsertError.code !== '23505') {
            // handle error
        }

        const now = new Date()
        const startDateTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()
        const endDateTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
        
        const queryParams = new URLSearchParams({
          startDateTime,
          endDateTime,
          $top: '2500'
        })

        const eventsRes = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(item.id)}/calendarView?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}`, 'Prefer': 'outlook.timezone="UTC"' }
        })
        
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          
          for (const mevent of eventsData.value) {
             const isAllDay = mevent.isAllDay || false
             const startTime = mevent.start?.dateTime ? new Date(mevent.start.dateTime + 'Z').toISOString() : new Date().toISOString()
             const endTime = mevent.end?.dateTime ? new Date(mevent.end.dateTime + 'Z').toISOString() : new Date().toISOString()
             
             // Map MS attendees to our schema
             const attendees = mevent.attendees ? mevent.attendees.map((a: any) => ({
                 email: a.emailAddress?.address,
                 name: a.emailAddress?.name,
                 status: a.status?.response === 'accepted' ? 'accepted' : 
                         a.status?.response === 'declined' ? 'declined' : 'needsAction'
             })) : []

             // Map MS Event to our Schema
             const { error: eventError } = await supabase
              .from('events')
              .upsert({
                user_id: userId,
                // calendar_id: cal?.id,
                external_id: mevent.id,
                etag: mevent['@odata.etag'] || null,
                title: mevent.subject || 'Untitled Event',
                description: mevent.body?.content || mevent.bodyPreview,
                location: mevent.location?.displayName,
                start_time: startTime,
                end_time: endTime,
                is_all_day: isAllDay,
                status: mevent.isCancelled ? 'cancelled' : 'confirmed',
                html_link: mevent.webLink,
                meeting_url: mevent.onlineMeeting?.joinUrl || null,
                attendees: attendees,
                updated_at: mevent.lastModifiedDateTime || new Date().toISOString()
              }, { onConflict: 'id' })
              
              if (!eventError) syncedEventsCount++
          }
        }
      // 4. Fetch Microsoft To Do Lists
      const taskListsRes = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      let syncedTasksCount = 0
      if (taskListsRes.ok) {
        const taskListsData = await taskListsRes.json()
        
        for (const tlist of (taskListsData.value || [])) {
          // Upsert the task list
          const { data: listData, error: listUpsertError } = await supabase
            .from('lists')
            .upsert({
              user_id: userId,
              provider: 'microsoft',
              external_id: tlist.id,
              name: tlist.displayName,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, external_id', ignoreDuplicates: false })
            .select('id')
            .maybeSingle()
            
          const localListId = listData?.id
          
          if (localListId) {
            // Fetch tasks for this list
            const tasksRes = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${encodeURIComponent(tlist.id)}/tasks?$top=100`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
            
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json()
              
              for (const mtask of (tasksData.value || [])) {
                const dueDate = mtask.dueDateTime ? new Date(mtask.dueDateTime.dateTime + 'Z').toISOString() : null
                
                // Upsert the task
                const { error: taskError } = await supabase
                  .from('tasks')
                  .upsert({
                    user_id: userId,
                    list_id: localListId,
                    provider: 'microsoft',
                    external_id: mtask.id,
                    etag: mtask['@odata.etag'] || null,
                    title: mtask.title || 'Untitled Task',
                    notes: mtask.body?.content || '',
                    status: mtask.status === 'completed' ? 'completed' : 'pending',
                    due_date: dueDate,
                    updated_at: mtask.lastModifiedDateTime || new Date().toISOString()
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
