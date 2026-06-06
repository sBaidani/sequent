import { corsHeaders } from './cors.ts'
import { ValidationError } from './validation.ts'

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

export function ok(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    headers: jsonHeaders,
    status: 200,
  })
}

export function created(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    headers: jsonHeaders,
    status: 201,
  })
}

export function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    headers: jsonHeaders,
    status: 400,
  })
}

export function unauthorized(message = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    headers: jsonHeaders,
    status: 401,
  })
}

export function notFound(message = 'Not found') {
  return new Response(JSON.stringify({ error: message }), {
    headers: jsonHeaders,
    status: 404,
  })
}

export function methodNotAllowed() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    headers: jsonHeaders,
    status: 405,
  })
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal server error'
  console.error('Server error:', err)
  return new Response(JSON.stringify({ error: message }), {
    headers: jsonHeaders,
    status: 500,
  })
}

/**
 * Standard error handler for Edge Functions.
 * Maps known error types to appropriate HTTP responses.
 */
export function handleError(err: unknown) {
  if (err instanceof ValidationError) {
    return badRequest(err.message)
  }
  if (err instanceof Error && err.message === 'Unauthorized') {
    return unauthorized()
  }
  if (err instanceof Error && err.message === 'Missing Authorization header') {
    return unauthorized('Missing Authorization header')
  }
  return serverError(err)
}

export function corsResponse() {
  return new Response('ok', { headers: corsHeaders })
}
