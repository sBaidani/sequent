const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required and must be a non-empty string`)
  }
  return value.trim()
}

export function requireUUID(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new ValidationError(`${field} must be a valid UUID`)
  }
  return value
}

export function optionalUUID(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  return requireUUID(value, field)
}

export function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`)
  }
  return value.trim() || null
}

export function optionalDate(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be an ISO date string`)
  }
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${field} is not a valid date`)
  }
  return value
}

export function optionalBoolean(value: unknown, field: string): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${field} must be a boolean`)
  }
  return value
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
