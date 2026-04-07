import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import { asRecord } from './helpers.js';

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('layouts', () => {
  let client: ReturnType<typeof createYodeckClient>;
  let createdId: number | string | undefined;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('lists layouts', async () => {
    const r = (await client.list('layouts', { limit: 5 })) as Paginated;
    expect(typeof r.count).toBe('number');
    expect(Array.isArray(r.results)).toBe(true);
  });

  it('create → get → update → delete when minimal layout is accepted', async () => {
    const ws = (await client.list('workspaces', { limit: 1 })) as Paginated;
    const wid = asRecord(ws.results[0]).id;
    const body: Record<string, unknown> = {
      name: `mcp-layout-${Date.now()}`,
      regions: [],
    };
    if (wid !== undefined && wid !== null) body.workspace = wid;

    const created = asRecord(await client.post('layouts', body));
    createdId = created.id as number | string;
    if (createdId === undefined || createdId === null) {
      expect.fail('create layout failed — adjust body (e.g. regions) for your account');
    }

    const got = asRecord(await client.get('layouts', createdId));
    expect(String(got.id)).toBe(String(createdId));

    await client.patch('layouts', createdId, {
      name: `${String(got.name ?? body.name)}-u`,
    });

    await client.delete('layouts', createdId);
  });
});
