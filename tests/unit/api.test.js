import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock supabase client
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('API Layer', () => {
  let api, ApiError, NetworkError, supabase;

  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn();
    const supaMod = await import('../../src/lib/supabase');
    supabase = supaMod.supabase;
    const apiMod = await import('../../src/lib/api');
    api = apiMod.api;
    ApiError = apiMod.ApiError;
    NetworkError = apiMod.NetworkError;
  });

  describe('Error Classes', () => {
    test('ApiError has correct name, status, and code', () => {
      const err = new ApiError('Not found', 404, 'NOT_FOUND');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ApiError');
      expect(err.message).toBe('Not found');
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    test('NetworkError has correct name and default message', () => {
      const err = new NetworkError();
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('NetworkError');
      expect(err.message).toBe('Network request failed');
    });

    test('NetworkError accepts custom message', () => {
      const err = new NetworkError('Connection timeout');
      expect(err.message).toBe('Connection timeout');
    });
  });

  describe('Authentication Requirement', () => {
    test('throws ApiError when no session exists', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      await expect(api.tasks.list()).rejects.toThrow('Not authenticated');
      await expect(api.tasks.list()).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_REQUIRED',
      });
    });
  });

  describe('Resource API Methods', () => {
    const mockSession = {
      access_token: 'test-token-123',
    };

    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
    });

    test('list() sends GET request to correct endpoint', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: '1', title: 'Task 1' }] }),
      });

      const result = await api.tasks.list();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/tasks'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual([{ id: '1', title: 'Task 1' }]);
    });

    test('get(id) sends GET request with id query param', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: '1', title: 'Task 1' } }),
      });

      await api.tasks.get('1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('id=1'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('create(data) sends POST request with JSON body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: '1', title: 'New Task' } }),
      });

      await api.tasks.create({ title: 'New Task' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/tasks'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Task' }),
        })
      );
    });

    test('update(data) sends PATCH request with JSON body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: '1', title: 'Updated' } }),
      });

      await api.tasks.update({ id: '1', title: 'Updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/tasks'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ id: '1', title: 'Updated' }),
        })
      );
    });

    test('delete(id) sends DELETE request with id in body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      await api.tasks.delete('1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/tasks'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ id: '1' }),
        })
      );
    });

    test('sends Authorization header with bearer token', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.tasks.list();

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer ' + mockSession.access_token);
    });

    test('throws ApiError on non-ok response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error', code: 'SERVER_ERROR' }),
      });

      await expect(api.tasks.list()).rejects.toMatchObject({
        name: 'ApiError',
        status: 500,
        code: 'SERVER_ERROR',
      });
    });

    test('throws NetworkError on fetch failure', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(api.tasks.list()).rejects.toMatchObject({
        name: 'NetworkError',
      });
    });
  });

  describe('All Resource APIs Exist', () => {
    test('api.tasks has CRUD methods', () => {
      expect(api.tasks).toHaveProperty('list');
      expect(api.tasks).toHaveProperty('get');
      expect(api.tasks).toHaveProperty('create');
      expect(api.tasks).toHaveProperty('update');
      expect(api.tasks).toHaveProperty('delete');
    });

    test('api.lists has CRUD methods', () => {
      expect(api.lists).toHaveProperty('list');
      expect(api.lists).toHaveProperty('create');
      expect(api.lists).toHaveProperty('update');
      expect(api.lists).toHaveProperty('delete');
    });

    test('api.events has CRUD methods', () => {
      expect(api.events).toHaveProperty('list');
      expect(api.events).toHaveProperty('create');
      expect(api.events).toHaveProperty('update');
      expect(api.events).toHaveProperty('delete');
    });

    test('api.calendars has CRUD methods', () => {
      expect(api.calendars).toHaveProperty('list');
      expect(api.calendars).toHaveProperty('create');
      expect(api.calendars).toHaveProperty('update');
      expect(api.calendars).toHaveProperty('delete');
    });

    test('api.sync has hydrate and push methods', () => {
      expect(api.sync).toHaveProperty('hydrate');
      expect(api.sync).toHaveProperty('push');
    });
  });

  describe('Sync API', () => {
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });
    });

    test('hydrate sends GET to sync endpoint', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { tasks: [], lists: [], events: [], calendars: [] } }),
      });

      const result = await api.sync.hydrate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/sync'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual({ tasks: [], lists: [], events: [], calendars: [] });
    });

    test('push sends POST to sync endpoint with mutations', async () => {
      const mutations = [
        { table: 'tasks', action: 'INSERT', payload: { id: '1', title: 'Test' } },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { results: [{ status: 'success' }] } }),
      });

      await api.sync.push(mutations);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/sync'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mutations }),
        })
      );
    });
  });
});
