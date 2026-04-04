import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { InMemoryStore } from '../core/store';
import { CapturedWebhook } from '../core/types';

export function createApp(maxSize = 1000): { app: express.Application; store: InMemoryStore } {
  const app = express();
  const store = new InMemoryStore(maxSize);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text());

  // CORS
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });

  // API: list captured webhooks
  app.get('/api/webhooks', (_req: Request, res: Response) => {
    res.json({
      count: store.count(),
      webhooks: store.getAll(),
    });
  });

  // API: get single webhook
  app.get('/api/webhooks/:id', (req: Request, res: Response) => {
    const webhook = store.getById(String(req.params.id));
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    res.json(webhook);
  });

  // API: clear all
  app.delete('/api/webhooks', (_req: Request, res: Response) => {
    store.clear();
    res.json({ cleared: true });
  });

  // API: replay a webhook
  app.post('/api/webhooks/:id/replay', async (req: Request, res: Response) => {
    const webhook = store.getById(String(req.params.id));
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).json({ error: 'Missing ?url= parameter' });
      return;
    }

    try {
      const response = await fetch(targetUrl, {
        method: webhook.method,
        headers: { 'Content-Type': webhook.contentType },
        body: webhook.method !== 'GET' ? JSON.stringify(webhook.body) : undefined,
      });
      res.json({ replayed: true, status: response.status });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Catch-all: capture any webhook
  app.all('/hook/*', (req: Request, res: Response) => {
    const webhook: CapturedWebhook = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, string>,
      body: req.body,
      contentType: req.get('content-type') || 'unknown',
      ip: req.ip || 'unknown',
      size: JSON.stringify(req.body).length,
    };

    store.capture(webhook);
    console.log(
      `  ${webhook.method} ${webhook.path} [${webhook.id.substring(0, 8)}] ${webhook.size}B`,
    );
    res.status(200).json({ received: true, id: webhook.id });
  });

  return { app, store };
}

// Start server when run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '5000');
  const { app } = createApp();
  app.listen(port, () => {
    console.log(`\nWebhook Tester running on http://localhost:${port}`);
    console.log(`  Capture: POST http://localhost:${port}/hook/anything`);
    console.log(`  Inspect: GET  http://localhost:${port}/api/webhooks\n`);
  });
}
