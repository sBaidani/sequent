/**
 * Server-side data mappers.
 * Converts between the UI-friendly API format and the database schema format.
 * Clients send/receive UI format; the database uses its own column naming.
 */

/** Map a task from UI format → DB format */
export function taskToDb(item: Record<string, unknown>, userId: string): Record<string, unknown> {
  const db: Record<string, unknown> = { ...item }
  db.user_id = userId

  // listId → list_id
  db.list_id = item.listId ?? null
  delete db.listId

  // completed (bool) → status (text)
  if (typeof item.completed === 'boolean') {
    db.status = item.completed ? 'completed' : 'pending'
  }
  delete db.completed

  // scheduled_date → due_date (DATE only)
  if (item.scheduled_date !== undefined) {
    db.due_date = typeof item.scheduled_date === 'string'
      ? item.scheduled_date.split('T')[0]
      : null
  }
  delete db.scheduled_date

  return db
}

/** Map a task from DB format → UI format */
export function taskFromDb(db: Record<string, unknown>): Record<string, unknown> {
  const item: Record<string, unknown> = { ...db }

  // list_id → listId
  item.listId = db.list_id ?? null
  delete item.list_id

  // status → completed
  item.completed = db.status === 'completed'
  delete item.status

  // due_date → scheduled_date (ISO string)
  item.scheduled_date = db.due_date
    ? new Date(db.due_date as string).toISOString()
    : null
  delete item.due_date

  // Remove internal fields clients don't need
  delete item.user_id
  delete item.sync_version

  return item
}

/** Map an event from UI format → DB format */
export function eventToDb(item: Record<string, unknown>, userId: string): Record<string, unknown> {
  const db: Record<string, unknown> = { ...item }
  db.user_id = userId

  // calendarId → calendar_id
  db.calendar_id = item.calendarId ?? null
  delete db.calendarId

  return db
}

/** Map an event from DB format → UI format */
export function eventFromDb(db: Record<string, unknown>): Record<string, unknown> {
  const item: Record<string, unknown> = { ...db }

  // calendar_id → calendarId
  item.calendarId = db.calendar_id ?? null
  delete item.calendar_id

  // Remove internal fields
  delete item.user_id
  delete item.sync_version

  return item
}

/** Map a list from UI format → DB format */
export function listToDb(item: Record<string, unknown>, userId: string): Record<string, unknown> {
  const db: Record<string, unknown> = { ...item }
  db.user_id = userId
  return db
}

/** Map a list from DB format → UI format */
export function listFromDb(db: Record<string, unknown>): Record<string, unknown> {
  const item: Record<string, unknown> = { ...db }
  delete item.user_id
  delete item.sync_version
  return item
}

/** Map a calendar from UI format → DB format */
export function calendarToDb(item: Record<string, unknown>, userId: string): Record<string, unknown> {
  const db: Record<string, unknown> = { ...item }
  db.user_id = userId
  db.provider = item.provider ?? 'local'
  return db
}

/** Map a calendar from DB format → UI format */
export function calendarFromDb(db: Record<string, unknown>): Record<string, unknown> {
  const item: Record<string, unknown> = { ...db }
  delete item.user_id
  delete item.sync_version
  return item
}
