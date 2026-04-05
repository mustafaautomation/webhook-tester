import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../../src/core/store';
import { CapturedWebhook } from '../../src/core/types';

function makeWebhook(overrides: Partial<CapturedWebhook> = {}): CapturedWebhook {
  return {
    id: `id-${Math.random().toString(36).slice(2, 8)}`,
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

describe('InMemoryStore — filtering', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore(100);
  });

  it('should filter by path', () => {
    store.capture(makeWebhook({ path: '/hook/github' }));
    store.capture(makeWebhook({ path: '/hook/stripe' }));
    store.capture(makeWebhook({ path: '/hook/github' }));

    expect(store.getByPath('/hook/github')).toHaveLength(2);
    expect(store.getByPath('/hook/stripe')).toHaveLength(1);
    expect(store.getByPath('/hook/unknown')).toHaveLength(0);
  });

  it('should filter by HTTP method', () => {
    store.capture(makeWebhook({ method: 'POST' }));
    store.capture(makeWebhook({ method: 'GET' }));
    store.capture(makeWebhook({ method: 'POST' }));
    store.capture(makeWebhook({ method: 'PUT' }));

    expect(store.getByMethod('POST')).toHaveLength(2);
    expect(store.getByMethod('GET')).toHaveLength(1);
    expect(store.getByMethod('PUT')).toHaveLength(1);
    expect(store.getByMethod('DELETE')).toHaveLength(0);
  });

  it('should be case-insensitive for method filter', () => {
    store.capture(makeWebhook({ method: 'POST' }));
    expect(store.getByMethod('post')).toHaveLength(1);
    expect(store.getByMethod('Post')).toHaveLength(1);
  });

  it('should get last N webhooks', () => {
    for (let i = 0; i < 10; i++) {
      store.capture(makeWebhook({ id: `id-${i}` }));
    }
    const last3 = store.getLast(3);
    expect(last3).toHaveLength(3);
    // Most recent first (unshift order)
    expect(last3[0].id).toBe('id-9');
  });
});

describe('InMemoryStore — capacity', () => {
  it('should enforce max size', () => {
    const store = new InMemoryStore(5);
    for (let i = 0; i < 10; i++) {
      store.capture(makeWebhook({ id: `id-${i}` }));
    }
    expect(store.count()).toBe(5);
    // Oldest should be evicted, newest kept
    expect(store.getById('id-9')).toBeDefined();
    expect(store.getById('id-0')).toBeUndefined();
  });

  it('should maintain LIFO order (newest first)', () => {
    const store = new InMemoryStore(100);
    store.capture(makeWebhook({ id: 'first' }));
    store.capture(makeWebhook({ id: 'second' }));
    store.capture(makeWebhook({ id: 'third' }));

    const all = store.getAll();
    expect(all[0].id).toBe('third');
    expect(all[2].id).toBe('first');
  });
});

describe('InMemoryStore — immutability', () => {
  it('should return copies from getAll', () => {
    const store = new InMemoryStore(100);
    store.capture(makeWebhook({ id: 'original' }));

    const all = store.getAll();
    all.pop(); // mutate the returned array
    expect(store.count()).toBe(1); // original unchanged
  });
});

describe('InMemoryStore — empty state', () => {
  it('should start empty', () => {
    const store = new InMemoryStore();
    expect(store.count()).toBe(0);
    expect(store.getAll()).toHaveLength(0);
  });

  it('should clear properly', () => {
    const store = new InMemoryStore();
    store.capture(makeWebhook());
    store.capture(makeWebhook());
    expect(store.count()).toBe(2);

    store.clear();
    expect(store.count()).toBe(0);
    expect(store.getAll()).toHaveLength(0);
  });

  it('should return undefined for missing ID', () => {
    const store = new InMemoryStore();
    expect(store.getById('nonexistent')).toBeUndefined();
  });
});
