import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { taskToDb, taskFromDb } from '../_shared/mapper.ts'
import { requireString, requireUUID, optionalUUID, optionalString, optionalDate, optionalBoolean } from '../_shared/validation.ts'
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
            .from('tasks')
            .select('*')
            .eq('id', validId)
            .eq('user_id', userId)
            .maybeSingle()
          if (error) throw error
          if (!data) return notFound('Task not found')
          return ok(taskFromDb(data))
        }

        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (error) throw error
        return ok((data || []).map(taskFromDb))
      }

      case 'POST': {
        const body = await req.json()
        const id = optionalUUID(body.id, 'id')
        const title = requireString(body.title, 'title')
        const priority = optionalString(body.priority, 'priority') || 'normal'
        const scheduledDate = optionalDate(body.scheduled_date, 'scheduled_date')
        const notes = optionalString(body.notes, 'notes')
        let listId = optionalUUID(body.listId, 'listId')

        // Auto-assign to first list if not provided
        if (!listId) {
          const { data: lists } = await supabase
            .from('lists')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)

          if (lists && lists.length > 0) {
            listId = lists[0].id
          } else {
            // Auto-create default list
            const { data: newList, error: listError } = await supabase
              .from('lists')
              .insert({ user_id: userId, name: 'My Tasks', color: '#6B5BDB' })
              .select()
              .single()
            if (listError) throw listError
            listId = newList.id
          }
        }

        const taskPayload = taskToDb({
          ...(id ? { id } : {}),
          title,
          listId,
          completed: false,
          priority,
          scheduled_date: scheduledDate,
          notes,
          created_at: body.created_at || new Date().toISOString(),
          updated_at: body.updated_at || new Date().toISOString(),
        }, userId)

        const { data, error } = await supabase
          .from('tasks')
          .upsert(taskPayload)
          .select()
          .single()
        if (error) throw error
        return created(taskFromDb(data))
      }

      case 'PATCH': {
        const body = await req.json()
        const id = requireUUID(body.id, 'id')

        // Build partial update
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

        if (body.title !== undefined) updates.title = requireString(body.title, 'title')
        if (body.listId !== undefined) updates.list_id = optionalUUID(body.listId, 'listId')
        if (body.completed !== undefined) updates.status = body.completed ? 'completed' : 'pending'
        if (body.priority !== undefined) updates.priority = optionalString(body.priority, 'priority')
        if (body.scheduled_date !== undefined) {
          updates.due_date = body.scheduled_date ? String(body.scheduled_date).split('T')[0] : null
        }
        if (body.notes !== undefined) updates.notes = optionalString(body.notes, 'notes')

        // LWW conflict resolution
        if (body.updated_at) {
          const { data: existing } = await supabase
            .from('tasks')
            .select('updated_at')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle()

          if (existing && new Date(existing.updated_at) > new Date(body.updated_at)) {
            // Server is newer — return the server version
            const { data: serverTask } = await supabase
              .from('tasks')
              .select('*')
              .eq('id', id)
              .single()
            return ok({ ...taskFromDb(serverTask), _conflict: 'server_won' })
          }
        }

        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single()
        if (error) throw error
        if (!data) return notFound('Task not found')
        return ok(taskFromDb(data))
      }

      case 'DELETE': {
        const body = await req.json()
        const id = requireUUID(body.id, 'id')

        const { error } = await supabase
          .from('tasks')
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
