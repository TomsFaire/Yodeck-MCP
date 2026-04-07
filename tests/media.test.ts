import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import { asRecord } from './helpers.js';

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('media', () => {
  let client: ReturnType<typeof createYodeckClient>;
  let createdId: number | string;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('lists media with pagination envelope', async () => {
    const r = (await client.list('media', { limit: 5 })) as Paginated;
    expect(typeof r.count).toBe('number');
    expect(Array.isArray(r.results)).toBe(true);
  });

  it('create → get → update → delete (URL-based)', async () => {
    const ws = (await client.list('workspaces', { limit: 1 })) as Paginated;
    const wid = asRecord(ws.results[0]).id;
    const body = {
      name: `mcp-vitest-${Date.now()}`,
      media_origin: { type: 'webpage', source: 'url' },
      arguments: { play_from_url: 'https://example.com' },
      workspace: { id: wid },
    };
    const created = asRecord(await client.post('media', body));
    createdId = created.id as number | string;
    expect(createdId !== undefined && createdId !== null).toBe(true);

    const got = asRecord(await client.get('media', createdId));
    expect(String(got.id)).toBe(String(createdId));

    await client.patch('media', createdId, {
      name: `${String(got.name ?? body.name)}-updated`,
    });

    await client.delete('media', createdId);
  });
});
