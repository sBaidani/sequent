import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { eventToDb, eventFromDb } from '../_shared/mapper.ts'
import { requireString, requireUUID, optionalUUID, optionalString, optionalDate } from '../_shared/validation.ts'
import { ok, created, notFound, methodNotAllowed, handleError, corsResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const supabase = createSupabaseClient(req)
    const userId = await getAuthUserId(supabase)
    const url = new URL(req.url)

    switch (req.method) {
      case 'GET': {
        const id = url.searchParams.get('id')
        if (id) {
          const validId = requireUUID(id, 'id')
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', validId)
            .eq('user_id', userId)
            .maybeSingle()
          if (error) throw error
          if (!data) return notFound('Event not found')
          return ok(eventFromDb(data))
        }

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true })
        if (error) throw error
        return ok((data || []).map(eventFromDb))
      }

      case 'POST': {
        const body = await req.json()
        const id = optionalUUID(body.id, 'id')
        const title = requireString(body.title, 'title')
        const startTime = requireString(body.start_time, 'start_time')
        const endTime = requireString(body.end_time, 'end_time')
        const location = optionalString(body.location, 'location')
        const notes = optionalString(body.notes, 'notes')
        let calendarId = optionalUUID(body.calendarId, 'calendarId')

        // Auto-assign to first calendar if not provided
        if (!calendarId) {
          const { data: calendars } = await supabase
            .from('calendars')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)

          if (calendars && calendars.length > 0) {
            calendarId = calendars[0].id
          } else {
            // Auto-create default calendar
            const { data: newCal, error: calError } = await supabase
              .from('calendars')
              .insert({ user_id: userId, name: 'Personal', color: '#E8942A', provider: 'local' })
              .select()
              .single()
            if (calError) throw calError
            calendarId = newCal.id
          }
        }

        const eventPayload = eventToDb({
          ...(id ? { id } : {}),
          title,
          start_time: startTime,
          end_time: endTime,
          calendarId,
          location,
          notes,
          created_at: body.created_at || new Date().toISOString(),
          updated_at: body.updated_at || new Date().toISOString(),
        }, userId)

        const { data, error } = await supabase
          .from('events')
          .upsert(eventPayload)
          .select()
          .single()
        if (error) throw error
        return created(eventFromDb(data))
      }

      case 'PATCH': {
        const body = await req.json()
        const id = requireUUID(body.id, 'id')

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

        if (body.title !== undefined) updates.title = requireString(body.title, 'title')
        if (body.calendarId !== undefined) updates.calendar_id = optionalUUID(body.calendarId, 'calendarId')
        if (body.start_time !== undefined) updates.start_time = requireString(body.start_time, 'start_time')
        if (body.end_time !== undefined) updates.end_time = requireString(body.end_time, 'end_time')
        if (body.location !== undefined) updates.location = optionalString(body.location, 'location')
        if (body.notes !== undefined) updates.notes = optionalString(body.notes, 'notes')

        // LWW conflict resolution
        if (body.updated_at) {
          const { data: existing } = await supabase
            .from('events')
            .select('updated_at')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle()

          if (existing && new Date(existing.updated_at) > new Date(body.updated_at)) {
            const { data: serverEvent } = await supabase
              .from('events')
              .select('*')
              .eq('id', id)
              .single()
            return ok({ ...eventFromDb(serverEvent), _conflict: 'server_won' })
          }
        }

        const { data, error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single()
        if (error) throw error
        if (!data) return notFound('Event not found')
        return ok(eventFromDb(data))
      }

      case 'DELETE': {
        const body = await req.json()
        const id = requireUUID(body.id, 'id')

        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
        if (error) throw error
        return ok({ id, deleted: true })
      }

      default:
        return methodNotAllowed()
    }
  } catch (err) {
    return handleError(err)
  }
})
