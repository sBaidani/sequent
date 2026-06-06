import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { calendarToDb, calendarFromDb } from '../_shared/mapper.ts'
import { requireString, requireUUID, optionalUUID, optionalString } from '../_shared/validation.ts'
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
            .from('calendars')
            .select('*')
            .eq('id', validId)
            .eq('user_id', userId)
            .maybeSingle()
          if (error) throw error
          if (!data) return notFound('Calendar not found')
          return ok(calendarFromDb(data))
        }

        const { data, error } = await supabase
          .from('calendars')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
        if (error) throw error
        return ok((data || []).map(calendarFromDb))
      }

      case 'POST': {
        const body = await req.json()
        const id = optionalUUID(body.id, 'id')
        const name = requireString(body.name, 'name')
        const color = requireString(body.color, 'color')

        const calPayload = calendarToDb({
          ...(id ? { id } : {}),
          name,
          color,
          created_at: body.created_at || new Date().toISOString(),
          updated_at: body.updated_at || new Date().toISOString(),
        }, userId)

        const { data, error } = await supabase
          .from('calendars')
          .upsert(calPayload)
          .select()
          .single()
        if (error) throw error
        return created(calendarFromDb(data))
      }

      case 'PATCH': {
        const body = await req.json()
        const id = requireUUID(body.id, 'id')

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (body.name !== undefined) updates.name = requireString(body.name, 'name')
        if (body.color !== undefined) updates.color = requireString(body.color, 'color')

        const { data, error } = await supabase
          .from('calendars')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single()
        if (error) throw error
        if (!data) return notFound('Calendar not found')
        return ok(calendarFromDb(data))
      }

      case 'DELETE': {
        const body = await req.json()
        const id = requireUUID(body.id, 'id')

        // Cascade delete handled by DB FK ON DELETE CASCADE
        const { error } = await supabase
          .from('calendars')
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
