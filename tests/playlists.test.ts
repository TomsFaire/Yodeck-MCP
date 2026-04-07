import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import { asRecord } from './helpers.js';

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('playlists', () => {
  let client: ReturnType<typeof createYodeckClient>;
  let createdId: number | string;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('lists playlists', async () => {
    const r = (await client.list('playlists', { limit: 5 })) as Paginated;
    expect(typeof r.count).toBe('number');
    expect(Array.isArray(r.results)).toBe(true);
  });

  it('create → get → update → delete', async () => {
    const ws = (await client.list('workspaces', { limit: 1 })) as Paginated;
    const wid = asRecord(ws.results[0]).id;
    const body: Record<string, unknown> = {
      name: `mcp-pl-${Date.now()}`,
      items: [],
    };
    if (wid !== undefined && wid !== null) body.workspace = { id: wid };

    const created = asRecord(await client.post('playlists', body));
    createdId = created.id as number | string;
    expect(createdId !== undefined && createdId !== null).toBe(true);

    const got = asRecord(await client.get('playlists', createdId));
    expect(String(got.id)).toBe(String(createdId));

    await client.patch('playlists', createdId, {
      name: `${String(got.name ?? body.name)}-u`,
    });

    await client.delete('playlists', createdId);
  });
});
