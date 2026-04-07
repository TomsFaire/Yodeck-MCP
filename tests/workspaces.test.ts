import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import { asRecord } from './helpers.js';

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('workspaces (no create/delete)', () => {
  let client: ReturnType<typeof createYodeckClient>;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('lists and gets a workspace', async () => {
    const r = (await client.list('workspaces', { limit: 5 })) as Paginated;
    expect(r.results.length).toBeGreaterThan(0);
    const first = asRecord(r.results[0]);
    const id = first.id;
    const one = asRecord(await client.get('workspaces', id as number | string));
    expect(String(one.id)).toBe(String(id));
  });

  // Workspace PATCH requires elevated token permissions — skipped for standard tokens.
  it.skip('patches workspace description round-trip', async () => {
    const r = (await client.list('workspaces', { limit: 1 })) as Paginated;
    const first = asRecord(r.results[0]);
    const id = first.id as number | string;
    const prev =
      typeof first.description === 'string' ? first.description : '';
    const marker = `mcp-test-${Date.now()}`;
    const updated = asRecord(
      await client.patch('workspaces', id, { description: marker }),
    );
    expect(updated.description).toBe(marker);
    await client.patch('workspaces', id, { description: prev });
  });
});
