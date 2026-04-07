import { beforeAll, describe, expect, it } from 'vitest';
import { createYodeckClient } from '../src/client.js';
import type { Paginated } from '../src/types.js';
import {
  searchMediaByName,
  summarizeScreenStatus,
  listScreensByWorkspaceName,
} from '../src/tools/semantic.js';
import { asRecord } from './helpers.js';

describe('semantic (unit)', () => {
  it('summarizeScreenStatus maps nested player_status', () => {
    const s = summarizeScreenStatus({
      id: 9,
      name: 'Lobby',
      player_status: {
        is_online: true,
        cpu_temperature: 48,
        memory_usage_percent: 62,
        uptime: 3600,
        version: '1.2.3',
      },
      content: { now_playing: 'Ad loop' },
    });
    expect(s.screen_id).toBe(9);
    expect(s.online).toBe(true);
    expect(s.cpu_temperature_c).toBe(48);
    expect(s.ram_usage_percent).toBe(62);
    expect(s.uptime_seconds).toBe(3600);
    expect(s.software_version).toBe('1.2.3');
    expect(s.currently_playing).toBe('Ad loop');
  });
});

const token = process.env.YODECK_API_TOKEN?.trim();
const d = token ? describe : describe.skip;

d('semantic (integration)', () => {
  let client: ReturnType<typeof createYodeckClient>;

  beforeAll(() => {
    client = createYodeckClient(token!);
  });

  it('yodeck_get_screen_status flow', async () => {
    const r = (await client.list('screens', { limit: 1 })) as Paginated;
    const id = asRecord(r.results[0]).id;
    const screen = await client.get('screens', id as number | string);
    const summary = summarizeScreenStatus(screen);
    expect(summary).toHaveProperty('screen_id');
    expect(summary).toHaveProperty('player_status');
  });

  it('yodeck_search_media returns filtered results', async () => {
    const listed = (await client.list('media', { limit: 20 })) as Paginated;
    expect(listed.results.length).toBeGreaterThan(0);
    const sampleName = String(asRecord(listed.results[0]).name ?? 'a');
    const q = sampleName.slice(0, Math.min(3, sampleName.length));
    const found = (await searchMediaByName(client, q, {})) as {
      results: unknown[];
    };
    expect(found.results.length).toBeGreaterThan(0);
  });

  it('yodeck_list_screens_by_workspace resolves workspace name', async () => {
    const ws = (await client.list('workspaces', { limit: 1 })) as Paginated;
    const name = asRecord(ws.results[0]).name;
    if (typeof name !== 'string') {
      expect.fail('workspace name missing');
    }
    const screens = (await listScreensByWorkspaceName(client, name, {
      limit: 50,
    })) as Paginated;
    expect(Array.isArray(screens.results)).toBe(true);
  });
});
