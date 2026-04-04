import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/server/app';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  const { app } = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe('Webhook Tester Server', () => {
  it('should capture a POST webhook', async () => {
    const res = await fetch(`${baseUrl}/hook/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'payment.success' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.id).toBeTruthy();
  });

  it('should list captured webhooks', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks`);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.webhooks[0].method).toBe('POST');
    expect(body.webhooks[0].path).toBe('/hook/stripe');
  });

  it('should get webhook by id', async () => {
    const list = await fetch(`${baseUrl}/api/webhooks`).then((r) => r.json());
    const id = list.webhooks[0].id;

    const res = await fetch(`${baseUrl}/api/webhooks/${id}`);
    expect(res.status).toBe(200);
    const webhook = await res.json();
    expect(webhook.id).toBe(id);
  });

  it('should return 404 for unknown webhook', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('should capture GET webhooks too', async () => {
    await fetch(`${baseUrl}/hook/health?status=ok`);
    const list = await fetch(`${baseUrl}/api/webhooks`).then((r) => r.json());
    const getHook = list.webhooks.find((w: { method: string }) => w.method === 'GET');
    expect(getHook).toBeTruthy();
    expect(getHook.path).toBe('/hook/health');
  });

  it('should clear all webhooks', async () => {
    await fetch(`${baseUrl}/api/webhooks`, { method: 'DELETE' });
    const list = await fetch(`${baseUrl}/api/webhooks`).then((r) => r.json());
    expect(list.count).toBe(0);
  });
});
