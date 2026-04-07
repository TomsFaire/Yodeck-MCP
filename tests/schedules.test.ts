import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import { asRecord } from './helpers.js';

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('schedules', () => {
  let client: ReturnType<typeof createYodeckClient>;
  let createdId: number | string | undefined;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('lists schedules', async () => {
    const r = (await client.list('schedules', { limit: 5 })) as Paginated;
    expect(typeof r.count).toBe('number');
    expect(Array.isArray(r.results)).toBe(true);
  });

  it('create → get → update → delete when API accepts minimal body', async () => {
    const ws = (await client.list('workspaces', { limit: 1 })) as Paginated;
    const wid = asRecord(ws.results[0]).id;
    const body: Record<string, unknown> = {
      name: `mcp-sch-${Date.now()}`,
      events: [],
    };
    if (wid !== undefined && wid !== null) body.workspace = wid;

    const created = asRecord(await client.post('schedules', body));
    createdId = created.id as number | string;
    if (createdId === undefined || createdId === null) {
      expect.fail('create schedule failed — adjust body for your account');
    }

    const got = asRecord(await client.get('schedules', createdId));
    expect(String(got.id)).toBe(String(createdId));

    await client.patch('schedules', createdId, {
      name: `${String(got.name ?? body.name)}-u`,
    });

    await client.delete('schedules', createdId);
  });
});
