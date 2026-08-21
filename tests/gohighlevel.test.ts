import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { syncContactToGoHighLevel, isGoHighLevelConfigured } from '@/lib/gohighlevel';

describe('GoHighLevel CRM sync', () => {
  const originalApiKey = process.env.GOHIGHLEVEL_API_KEY;
  const originalLocationId = process.env.GOHIGHLEVEL_LOCATION_ID;
  const originalApiBase = process.env.GOHIGHLEVEL_API_BASE;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOHIGHLEVEL_API_KEY;
    delete process.env.GOHIGHLEVEL_LOCATION_ID;
    delete process.env.GOHIGHLEVEL_API_BASE;
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.GOHIGHLEVEL_API_KEY; else process.env.GOHIGHLEVEL_API_KEY = originalApiKey;
    if (originalLocationId === undefined) delete process.env.GOHIGHLEVEL_LOCATION_ID; else process.env.GOHIGHLEVEL_LOCATION_ID = originalLocationId;
    if (originalApiBase === undefined) delete process.env.GOHIGHLEVEL_API_BASE; else process.env.GOHIGHLEVEL_API_BASE = originalApiBase;
  });

  it('reports not configured when credentials are missing', async () => {
    expect(isGoHighLevelConfigured()).toBe(false);

    const result = await syncContactToGoHighLevel({ email: 'golfer@example.com' });

    expect(result).toEqual({ synced: false, reason: 'GoHighLevel is not configured' });
  });

  it('calls the GoHighLevel v2 contacts upsert endpoint with the correct payload when configured', async () => {
    process.env.GOHIGHLEVEL_API_KEY = 'test-api-key';
    process.env.GOHIGHLEVEL_LOCATION_ID = 'test-location';

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    expect(isGoHighLevelConfigured()).toBe(true);

    const result = await syncContactToGoHighLevel({
      email: 'golfer@example.com',
      tags: ['GCore Order'],
      source: 'GCore Order',
    });

    expect(result).toEqual({ synced: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://services.leadconnectorhq.com/contacts/upsert',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
          Version: '2021-07-28',
        }),
      })
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody).toMatchObject({
      locationId: 'test-location',
      email: 'golfer@example.com',
      tags: ['GCore Order'],
      source: 'GCore Order',
    });
  });

  it('returns a failure reason when GoHighLevel responds with a non-ok status', async () => {
    process.env.GOHIGHLEVEL_API_KEY = 'test-api-key';
    process.env.GOHIGHLEVEL_LOCATION_ID = 'test-location';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }));

    const result = await syncContactToGoHighLevel({ email: 'golfer@example.com' });

    expect(result).toEqual({ synced: false, reason: 'GoHighLevel sync failed (401): Unauthorized' });
  });

  it('does not throw when the network request fails', async () => {
    process.env.GOHIGHLEVEL_API_KEY = 'test-api-key';
    process.env.GOHIGHLEVEL_LOCATION_ID = 'test-location';

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await syncContactToGoHighLevel({ email: 'golfer@example.com' });

    expect(result).toEqual({ synced: false, reason: 'network down' });
  });
});
