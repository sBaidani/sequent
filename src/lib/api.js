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
  console.log(`[API] request called: ${method} ${functionName}`);
  console.log(`[API] calling supabase.auth.getSession()...`);
  const { data: { session } } = await supabase.auth.getSession();
  console.log(`[API] session retrieved!`);
  
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
    console.log(`[API] calling fetch(${url})...`);
    response = await fetch(url, options);
    console.log(`[API] fetch returned! status:`, response.status);
  } catch (err) {
    console.error(`[API] fetch threw an error:`, err);
    throw new NetworkError(err.message);
  }

  console.log(`[API] reading response.json()...`);
  const json = await response.json();
  console.log(`[API] json read!`);

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
  auth: {
    getAuthUrl: async (provider) => {
      const functionName = `auth-${provider}`;
      return request(functionName, 'GET', null, { action: 'get_auth_url' });
    },
    finalizeConnection: async (provider, code) => {
      const functionName = `auth-${provider}`;
      return request(functionName, 'POST', { code });
    },
    triggerSync: async (provider) => {
      const functionName = `sync-${provider}`;
      return request(functionName, 'POST');
    }
  }
};

export { ApiError, NetworkError };
