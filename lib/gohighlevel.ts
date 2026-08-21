const GHL_API_BASE = (process.env.GOHIGHLEVEL_API_BASE?.trim() || 'https://services.leadconnectorhq.com').replace(/\/$/, '');
const GHL_API_VERSION = '2021-07-28';

export type GoHighLevelContactPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  source?: string;
};

export type GoHighLevelSyncResult =
  | { synced: true }
  | { synced: false; reason: string };

function getGoHighLevelCredentials() {
  const apiKey = process.env.GOHIGHLEVEL_API_KEY?.trim();
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID?.trim();
  return { apiKey, locationId };
}

export function isGoHighLevelConfigured() {
  const { apiKey, locationId } = getGoHighLevelCredentials();
  return Boolean(apiKey && locationId);
}

// Upserts a contact in GoHighLevel (CRM) via the v2 Private Integration API.
export async function syncContactToGoHighLevel(payload: GoHighLevelContactPayload): Promise<GoHighLevelSyncResult> {
  const { apiKey, locationId } = getGoHighLevelCredentials();

  if (!apiKey || !locationId) {
    return { synced: false, reason: 'GoHighLevel is not configured' };
  }

  try {
    const response = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        tags: payload.tags,
        source: payload.source ?? 'GCore',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return { synced: false, reason: `GoHighLevel sync failed (${response.status}): ${errorText}` };
    }

    return { synced: true };
  } catch (error) {
    return { synced: false, reason: error instanceof Error ? error.message : 'GoHighLevel sync failed' };
  }
}
