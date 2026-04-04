export interface CapturedWebhook {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  contentType: string;
  ip: string;
  size: number;
}

export interface WebhookStore {
  capture(webhook: CapturedWebhook): void;
  getAll(): CapturedWebhook[];
  getById(id: string): CapturedWebhook | undefined;
  clear(): void;
  count(): number;
}
