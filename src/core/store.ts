import { CapturedWebhook, WebhookStore } from './types';

export class InMemoryStore implements WebhookStore {
  private webhooks: CapturedWebhook[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  capture(webhook: CapturedWebhook): void {
    this.webhooks.unshift(webhook);
    if (this.webhooks.length > this.maxSize) {
      this.webhooks = this.webhooks.slice(0, this.maxSize);
    }
  }

  getAll(): CapturedWebhook[] {
    return [...this.webhooks];
  }

  getById(id: string): CapturedWebhook | undefined {
    return this.webhooks.find((w) => w.id === id);
  }

  clear(): void {
    this.webhooks = [];
  }

  count(): number {
    return this.webhooks.length;
  }

  getByPath(path: string): CapturedWebhook[] {
    return this.webhooks.filter((w) => w.path === path);
  }

  getByMethod(method: string): CapturedWebhook[] {
    return this.webhooks.filter((w) => w.method === method.toUpperCase());
  }

  getLast(n: number): CapturedWebhook[] {
    return this.webhooks.slice(0, n);
  }
}
