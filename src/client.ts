import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export const YODECK_API_BASE = 'https://app.yodeck.com/api/v2/';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(headers: Record<string, unknown>): number {
  const raw = headers['retry-after'] ?? headers['Retry-After'];
  const s =
    typeof raw === 'string'
      ? parseInt(raw, 10)
      : Array.isArray(raw)
        ? parseInt(String(raw[0]), 10)
        : NaN;
  return Number.isFinite(s) && s >= 0 ? s : 1;
}

export function extractApiMessage(data: unknown): string {
  if (data == null) return 'Request failed';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    // Yodeck v2 error envelope: { error: { message, code, details } }
    if (o.error !== null && typeof o.error === 'object') {
      const e = o.error as Record<string, unknown>;
      if (typeof e.message === 'string') return e.message;
    }
    if (typeof o.detail === 'string') return o.detail;
    if (Array.isArray(o.detail)) return o.detail.map(String).join('; ');
    if (typeof o.message === 'string') return o.message;
    try {
      return JSON.stringify(data);
    } catch {
      return 'Request failed';
    }
  }
  return String(data);
}

export type ListParams = {
  limit?: number;
  offset?: number;
  workspace?: number;
};

export class YodeckClient {
  private readonly http: AxiosInstance;

  constructor(token: string) {
    this.http = axios.create({
      baseURL: YODECK_API_BASE,
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Never throw on HTTP errors — our request() method handles all status codes.
      validateStatus: () => true,
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const exec = async () => this.http.request<T>(config);
    let res = await exec();
    if (res.status === 429) {
      const waitSec = parseRetryAfter(res.headers as Record<string, unknown>);
      await sleep(waitSec * 1000);
      res = await exec();
      if (res.status === 429) {
        throw new Error(
          'Yodeck rate limit hit again after retry. Please wait before retrying.',
        );
      }
    }
    if (res.status >= 400) {
      const msg = extractApiMessage(res.data);
      throw new Error(`Yodeck API error ${res.status}: ${msg}`);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return res.data as T;
  }

  /** GET collection with limit (default 100), offset, workspace filter */
  async list(segment: string, params: ListParams = {}): Promise<unknown> {
    const { limit = 100, offset, workspace } = params;
    const search = new URLSearchParams();
    search.set('limit', String(limit));
    if (offset !== undefined) search.set('offset', String(offset));
    if (workspace !== undefined) search.set('workspace', String(workspace));
    const path = `${segment.replace(/\/?$/, '/')}?${search.toString()}`;
    return this.request({ method: 'GET', url: path });
  }

  async get(segment: string, id: number | string): Promise<unknown> {
    const base = segment.replace(/\/?$/, '');
    return this.request({ method: 'GET', url: `${base}/${id}/` });
  }

  async post(segment: string, body: unknown): Promise<unknown> {
    const path = segment.replace(/\/?$/, '/');
    return this.request({ method: 'POST', url: path, data: body });
  }

  async patch(segment: string, id: number | string, body: unknown): Promise<unknown> {
    const base = segment.replace(/\/?$/, '');
    return this.request({ method: 'PATCH', url: `${base}/${id}/`, data: body });
  }

  async delete(segment: string, id: number | string): Promise<void> {
    const base = segment.replace(/\/?$/, '');
    await this.request({ method: 'DELETE', url: `${base}/${id}/` });
  }
}

export function createYodeckClient(token: string): YodeckClient {
  return new YodeckClient(token);
}
