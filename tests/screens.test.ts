import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import { asRecord } from './helpers.js';

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('screens (no create/delete)', () => {
  let client: ReturnType<typeof createYodeckClient>;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('lists and gets a screen', async () => {
    const r = (await client.list('screens', { limit: 5 })) as Paginated;
    expect(r.results.length).toBeGreaterThan(0);
    const first = asRecord(r.results[0]);
    const id = first.id;
    expect(id).toBeDefined();
    const one = asRecord(await client.get('screens', id as number | string));
    expect(String(one.id)).toBe(String(id));
  });

  it('updates a screen with a no-op name patch when possible', async () => {
    const r = (await client.list('screens', { limit: 1 })) as Paginated;
    const first = asRecord(r.results[0]);
    const id = first.id as number | string;
    const name = first.name;
    if (typeof name !== 'string') {
      expect.fail('screen has no name string');
    }
    const updated = asRecord(await client.patch('screens', id, { name }));
    expect(String(updated.id)).toBe(String(id));
  });
});
