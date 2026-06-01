import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Makes an authenticated request to a Supabase Edge Function.
 */
async function request(functionName, method, body = null, params = null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new ApiError('Not authenticated', 401, 'AUTH_REQUIRED');
  }

  let url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + session.access_token,
  };

  const options = { method, headers };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new NetworkError(err.message);
  }

  const json = await response.json();

  if (!response.ok) {
    const error = new ApiError(
      json.error || `Request failed with status ${response.status}`,
      response.status,
      json.code
    );
    // Preserve Postgres error codes for stale session detection
    if (json.code) error.code = json.code;
    throw error;
  }

  return json.data;
}

/**
 * Creates a resource API for a given Edge Function name.
 */
function createResourceApi(functionName) {
  return {
    list: () => request(functionName, 'GET'),
    get: (id) => request(functionName, 'GET', null, { id }),
    create: (data) => request(functionName, 'POST', data),
    update: (data) => request(functionName, 'PATCH', data),
    delete: (id) => request(functionName, 'DELETE', { id }),
  };
}

export const api = {
  tasks: createResourceApi('tasks'),
  lists: createResourceApi('lists'),
  events: createResourceApi('events'),
  calendars: createResourceApi('calendars'),

  sync: {
    /** Full hydrate — returns { tasks, lists, events, calendars } in UI format */
    hydrate: () => request('sync', 'GET'),

    /** Batch push offline mutations — returns { results: [...] } with per-item status */
    push: (mutations) => request('sync', 'POST', { mutations }),
  },
};

export { ApiError, NetworkError };
