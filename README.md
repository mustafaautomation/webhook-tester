# Webhook Tester

[![CI](https://github.com/mustafaautomation/webhook-tester/actions/workflows/ci.yml/badge.svg)](https://github.com/mustafaautomation/webhook-tester/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

Capture, inspect, and replay webhooks. Point any webhook provider (Stripe, GitHub, Slack) at this server and see exactly what was sent — headers, body, timing, everything.

---

## How It Works

```
Stripe/GitHub/Slack → POST /hook/anything → Captured → GET /api/webhooks → Inspect
                                                             ↓
                                                    POST /api/webhooks/:id/replay → Re-send
```

---

## Quick Start

```bash
# Start server
npx webhook-tester

# Or with Docker
docker run --rm -p 5000:5000 ghcr.io/mustafaautomation/webhook-tester

# Send a test webhook
curl -X POST http://localhost:5000/hook/stripe \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.success","amount":2999}'

# Inspect captured webhooks
curl http://localhost:5000/api/webhooks
```

---

## API

| Endpoint | Description |
|----------|-------------|
| `ANY /hook/*` | Capture any webhook (returns `{ received: true, id }`) |
| `GET /api/webhooks` | List all captured webhooks |
| `GET /api/webhooks/:id` | Get single webhook details |
| `DELETE /api/webhooks` | Clear all captured webhooks |
| `POST /api/webhooks/:id/replay?url=...` | Replay a webhook to a target URL |

---

## Use Cases

- **Testing webhook integrations** — Stripe, GitHub, Slack, Twilio
- **Debugging** — See exactly what a service sends
- **CI verification** — Assert webhooks were sent with correct data
- **Load testing** — Capture during load tests, analyze payload patterns
- **Replay** — Re-send a captured webhook to test your handler

---

## Library API

```typescript
import { createApp, InMemoryStore } from 'webhook-tester';

const { app, store } = createApp(500); // max 500 stored webhooks
app.listen(5000);

// Programmatic access
store.getAll();
store.getByPath('/hook/stripe');
store.getByMethod('POST');
store.getLast(10);
```

---

## Project Structure

```
webhook-tester/
├── src/
│   ├── core/
│   │   ├── types.ts       # CapturedWebhook, WebhookStore interface
│   │   └── store.ts       # In-memory store with max size, filtering
│   ├── server/
│   │   └── app.ts         # Express server — capture + API + replay
│   └── index.ts
├── tests/unit/
│   ├── store.test.ts      # 8 tests — CRUD, filtering, max size
│   └── server.test.ts     # 6 tests — full integration
├── Dockerfile
└── .github/workflows/ci.yml
```

---

## License

MIT

---

Built by [Quvantic](https://quvantic.com)
