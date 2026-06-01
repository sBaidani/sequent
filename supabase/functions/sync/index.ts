import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { taskToDb, taskFromDb, eventToDb, eventFromDb, listToDb, listFromDb, calendarToDb, calendarFromDb } from '../_shared/mapper.ts'
import { ok, badRequest, methodNotAllowed, handleError, corsResponse } from '../_shared/response.ts'

interface Mutation {
  table: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Record<string, unknown>
}

interface MutationResult {
  table: string
  action: string
  id: string
  status: 'success' | 'conflict' | 'error'
  data?: Record<string, unknown>
  error?: string
}

const toDbMap: Record<string, (item: Record<string, unknown>, userId: string) => Record<string, unknown>> = {
  tasks: taskToDb,
  lists: listToDb,
  events: eventToDb,
  calendars: calendarToDb,
}

const fromDbMap: Record<string, (db: Record<string, unknown>) => Record<string, unknown>> = {
  tasks: taskFromDb,
  lists: listFromDb,
  events: eventFromDb,
  calendars: calendarFromDb,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const supabase = createSupabaseClient(req)
    const userId = await getAuthUserId(supabase)

    switch (req.method) {
      case 'GET': {
        // Full hydrate — returns all user data pre-mapped to UI format
        const [tasksRes, listsRes, eventsRes, calsRes] = await Promise.all([
          supabase.from('tasks').select('*').eq('user_id', userId),
          supabase.from('lists').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('events').select('*').eq('user_id', userId),
          supabase.from('calendars').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        ])

        if (tasksRes.error) throw tasksRes.error
        if (listsRes.error) throw listsRes.error
        if (eventsRes.error) throw eventsRes.error
        if (calsRes.error) throw calsRes.error

        return ok({
          tasks: (tasksRes.data || []).map(taskFromDb),
          lists: (listsRes.data || []).map(listFromDb),
          events: (eventsRes.data || []).map(eventFromDb),
          calendars: (calsRes.data || []).map(calendarFromDb),
        })
      }

      case 'POST': {
        // Batch sync — process an array of mutations individually
        const body = await req.json()
        const mutations: Mutation[] = body.mutations

        if (!Array.isArray(mutations)) {
          return badRequest('mutations must be an array')
        }

        const results: MutationResult[] = []

        for (const mutation of mutations) {
          const { table, action, payload } = mutation
          const itemId = payload.id as string

          if (!toDbMap[table]) {
            results.push({ table, action, id: itemId, status: 'error', error: `Unknown table: ${table}` })
            continue
          }

          try {
            if (action === 'INSERT' || action === 'UPDATE') {
              const dbPayload = toDbMap[table](payload, userId)

              // LWW conflict resolution for updates
              if (action === 'UPDATE' && payload.updated_at) {
                const { data: serverRecord } = await supabase
                  .from(table)
                  .select('updated_at')
                  .eq('id', itemId)
                  .eq('user_id', userId)
                  .maybeSingle()

                if (serverRecord && new Date(serverRecord.updated_at as string) > new Date(payload.updated_at as string)) {
                  // Server is newer, return server version
                  const { data: serverItem } = await supabase
                    .from(table)
                    .select('*')
                    .eq('id', itemId)
                    .single()
                  results.push({
                    table,
                    action,
                    id: itemId,
                    status: 'conflict',
                    data: serverItem ? fromDbMap[table](serverItem) : undefined,
                  })
                  continue
                }
              }

              const { data, error } = await supabase
                .from(table)
                .upsert(dbPayload)
                .select()
                .single()

              if (error) throw error
              results.push({
                table,
                action,
                id: itemId,
                status: 'success',
                data: fromDbMap[table](data),
              })
            } else if (action === 'DELETE') {
              const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', itemId)
                .eq('user_id', userId)

              if (error) throw error
              results.push({ table, action, id: itemId, status: 'success' })
            } else {
              results.push({ table, action, id: itemId, status: 'error', error: `Unknown action: ${action}` })
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            results.push({ table, action, id: itemId, status: 'error', error: message })
          }
        }

        return ok({ results })
      }

      default:
        return methodNotAllowed()
    }
  } catch (err) {
    return handleError(err)
  }
})
