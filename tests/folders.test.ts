import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import { asRecord } from './helpers.js';

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('folders', () => {
  let client: ReturnType<typeof createYodeckClient>;
  let createdId: number | string | undefined;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('lists folders', async () => {
    const r = (await client.list('folders', { limit: 5 })) as Paginated;
    expect(typeof r.count).toBe('number');
    expect(Array.isArray(r.results)).toBe(true);
  });

  it('create → get → update → delete when folder_type is accepted', async () => {
    const ws = (await client.list('workspaces', { limit: 1 })) as Paginated;
    const wid = asRecord(ws.results[0]).id;
    if (wid === undefined || wid === null) {
      expect.fail('no workspace');
    }
    const body = {
      name: `mcp-folder-${Date.now()}`,
      workspace: wid,
      folder_type: 'media',
    };

    const created = asRecord(await client.post('folders', body));
    createdId = created.id as number | string;
    if (createdId === undefined || createdId === null) {
      expect.fail('create folder failed — check folder_type for your account');
    }

    const got = asRecord(await client.get('folders', createdId));
    expect(String(got.id)).toBe(String(createdId));

    await client.patch('folders', createdId, {
      name: `${String(got.name ?? body.name)}-u`,
    });

    await client.delete('folders', createdId);
  });
});
