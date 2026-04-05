import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/server/app';

let server: http.Server;
let port: number;
let baseUrl: string;

beforeAll(async () => {
  const { app } = createApp(100);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as { port: number }).port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

async function sendWebhook(path: string, body: unknown, method = 'POST'): Promise<Response> {
  return fetch(`${baseUrl}/hook/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
}

describe('Webhook capture — various payloads', () => {
  it('should capture JSON webhook', async () => {
    const res = await sendWebhook('github', { event: 'push', ref: 'refs/heads/main' });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.id).toBeTruthy();
  });

  it('should capture webhook with nested body', async () => {
    const res = await sendWebhook('stripe', {
      type: 'payment_intent.succeeded',
      data: { object: { amount: 2000, currency: 'usd' } },
    });
    expect(res.status).toBe(200);
  });

  it('should capture webhook with array body', async () => {
    const res = await sendWebhook('batch', [
      { id: 1, action: 'create' },
      { id: 2, action: 'update' },
    ]);
    expect(res.status).toBe(200);
  });

  it('should capture GET webhooks', async () => {
    const res = await fetch(`${baseUrl}/hook/ping?status=ok`);
    expect(res.status).toBe(200);
  });

  it('should capture PUT webhooks', async () => {
    const res = await sendWebhook('update', { status: 'active' }, 'PUT');
    expect(res.status).toBe(200);
  });

  it('should capture DELETE webhooks', async () => {
    const res = await fetch(`${baseUrl}/hook/cleanup`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});

describe('API — list and inspect', () => {
  it('should list all captured webhooks', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.count).toBeGreaterThan(0);
    expect(data.webhooks).toBeInstanceOf(Array);
  });

  it('should get single webhook by ID', async () => {
    // Capture one first
    const captureRes = await sendWebhook('inspect-test', { test: true });
    const captureData = await captureRes.json();
    const id = captureData.id;

    // Fetch it
    const res = await fetch(`${baseUrl}/api/webhooks/${id}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe(id);
    expect(data.path).toContain('inspect-test');
    expect(data.body).toEqual({ test: true });
  });

  it('should return 404 for non-existent webhook', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/non-existent-id`);
    expect(res.status).toBe(404);
  });
});

describe('API — clear', () => {
  it('should clear all captured webhooks', async () => {
    // Capture some
    await sendWebhook('to-clear', { data: 1 });

    // Clear
    const clearRes = await fetch(`${baseUrl}/api/webhooks`, { method: 'DELETE' });
    const clearData = await clearRes.json();
    expect(clearData.cleared).toBe(true);

    // Verify empty
    const listRes = await fetch(`${baseUrl}/api/webhooks`);
    const listData = await listRes.json();
    expect(listData.count).toBe(0);
  });
});

describe('API — replay', () => {
  it('should return 404 for replaying non-existent webhook', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/fake-id/replay?url=http://localhost:1`, {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });

  it('should return 400 when replay URL is missing', async () => {
    // Capture one first
    const captureRes = await sendWebhook('replay-test', { replay: true });
    const captureData = await captureRes.json();

    const res = await fetch(`${baseUrl}/api/webhooks/${captureData.id}/replay`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('url');
  });
});

describe('Webhook metadata', () => {
  it('should capture headers', async () => {
    const captureRes = await fetch(`${baseUrl}/hook/headers-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'test-value',
      },
      body: JSON.stringify({ x: 1 }),
    });
    const captureData = await captureRes.json();

    const res = await fetch(`${baseUrl}/api/webhooks/${captureData.id}`);
    const data = await res.json();
    expect(data.headers['x-custom-header']).toBe('test-value');
  });

  it('should capture query parameters', async () => {
    const captureRes = await fetch(`${baseUrl}/hook/query-test?key=value&page=2`);
    const captureData = await captureRes.json();

    const res = await fetch(`${baseUrl}/api/webhooks/${captureData.id}`);
    const data = await res.json();
    expect(data.query.key).toBe('value');
    expect(data.query.page).toBe('2');
  });

  it('should record correct HTTP method', async () => {
    const captureRes = await sendWebhook('method-test', {}, 'PUT');
    const captureData = await captureRes.json();

    const res = await fetch(`${baseUrl}/api/webhooks/${captureData.id}`);
    const data = await res.json();
    expect(data.method).toBe('PUT');
  });

  it('should record timestamp', async () => {
    const captureRes = await sendWebhook('time-test', {});
    const captureData = await captureRes.json();

    const res = await fetch(`${baseUrl}/api/webhooks/${captureData.id}`);
    const data = await res.json();
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe('CORS', () => {
  it('should include CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
