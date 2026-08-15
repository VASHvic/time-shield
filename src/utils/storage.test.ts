import { getCurrentDate } from '@/utils/time';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUsageKeys } from './storage';

describe('getUsageKeys', () => {
  it('builds total and daily keys with the current date by default', () => {
    const keys = getUsageKeys('youtube.com');
    expect(keys).toEqual({
      totalKey: 'youtube.com',
      dailyKey: `youtube.com_${getCurrentDate()}`,
    });
  });

  it('builds keys with an explicit date', () => {
    const keys = getUsageKeys('youtube.com', '2026-08-14');
    expect(keys).toEqual({
      totalKey: 'youtube.com',
      dailyKey: 'youtube.com_2026-08-14',
    });
  });
});

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('round-trips values through storage', async () => {
    const { StorageService } = await import('./storage');
    const svc = new StorageService(chrome.storage.local);

    await svc.set({ foo: 42 });
    const result = await svc.get<{ foo: number }>('foo');
    expect(result.foo).toBe(42);
  });

  it('reads multiple keys at once', async () => {
    const { StorageService } = await import('./storage');
    const svc = new StorageService(chrome.storage.local);

    await svc.set({ a: 1, b: 2 });
    const result = await svc.get<{ a: number; b: number }>(['a', 'b']);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('clears all data', async () => {
    const { StorageService } = await import('./storage');
    const svc = new StorageService(chrome.storage.local);

    await svc.set({ a: 1 });
    await svc.clear();
    const result = await svc.get<Record<string, unknown>>(null);
    expect(result).toEqual({});
  });
});
