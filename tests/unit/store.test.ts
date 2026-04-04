import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../../src/core/store';
import { CapturedWebhook } from '../../src/core/types';

function makeWebhook(overrides: Partial<CapturedWebhook> = {}): CapturedWebhook {
  return {
    id: `wh-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/hook/test',
    headers: { 'content-type': 'application/json' },
    query: {},
    body: { event: 'test' },
    contentType: 'application/json',
    ip: '127.0.0.1',
    size: 20,
    ...overrides,
  };
}

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore(100);
  });

  it('should capture and retrieve webhooks', () => {
    const wh = makeWebhook();
    store.capture(wh);
    expect(store.count()).toBe(1);
    expect(store.getAll()[0].id).toBe(wh.id);
  });

  it('should get by id', () => {
    const wh = makeWebhook({ id: 'test-123' });
    store.capture(wh);
    expect(store.getById('test-123')?.id).toBe('test-123');
    expect(store.getById('nonexistent')).toBeUndefined();
  });

  it('should store newest first', () => {
    store.capture(makeWebhook({ id: 'first' }));
    store.capture(makeWebhook({ id: 'second' }));
    expect(store.getAll()[0].id).toBe('second');
  });

  it('should enforce max size', () => {
    const small = new InMemoryStore(3);
    for (let i = 0; i < 5; i++) small.capture(makeWebhook());
    expect(small.count()).toBe(3);
  });

  it('should clear all webhooks', () => {
    store.capture(makeWebhook());
    store.capture(makeWebhook());
    store.clear();
    expect(store.count()).toBe(0);
  });

  it('should filter by path', () => {
    store.capture(makeWebhook({ path: '/hook/stripe' }));
    store.capture(makeWebhook({ path: '/hook/github' }));
    store.capture(makeWebhook({ path: '/hook/stripe' }));
    expect(store.getByPath('/hook/stripe')).toHaveLength(2);
  });

  it('should filter by method', () => {
    store.capture(makeWebhook({ method: 'POST' }));
    store.capture(makeWebhook({ method: 'GET' }));
    expect(store.getByMethod('POST')).toHaveLength(1);
  });

  it('should get last N webhooks', () => {
    for (let i = 0; i < 10; i++) store.capture(makeWebhook());
    expect(store.getLast(3)).toHaveLength(3);
  });
});
