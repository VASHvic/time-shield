import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import enMessages from '../../public/_locales/en/messages.json';

const enMessagesMap = enMessages as Record<string, { message: string }>;

const memory: Record<string, unknown> = {};

type ChangeListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  areaName: string,
) => void;

const onChangedListeners = new Set<ChangeListener>();

const local = {
  get: vi.fn(
    (keys: string | string[] | null, callback?: (result: Record<string, unknown>) => void) => {
      const result =
        keys === null
          ? { ...memory }
          : Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys])
                .filter((key) => key in memory)
                .map((key) => [key, memory[key]]),
            );
      if (callback) callback(result);
      return Promise.resolve(result);
    },
  ),
  set: vi.fn(async (values: Record<string, unknown>) => {
    const changes = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, { newValue: value }]),
    );
    Object.assign(memory, values);
    for (const listener of onChangedListeners) {
      listener(changes, 'local');
    }
  }),
  clear: vi.fn(async () => {
    for (const key of Object.keys(memory)) {
      delete memory[key];
    }
  }),
};

vi.stubGlobal('chrome', {
  storage: {
    local,
    onChanged: {
      addListener: (listener: ChangeListener) => onChangedListeners.add(listener),
      removeListener: (listener: ChangeListener) => onChangedListeners.delete(listener),
    },
  },
  tabs: {
    query: vi.fn(async () => []),
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    sendMessage: vi.fn(),
  },
  i18n: {
    getMessage: vi.fn((key: string, substitutions?: string | string[]) => {
      const entry = enMessagesMap[key];
      if (!entry) return '';
      const subs = Array.isArray(substitutions)
        ? substitutions
        : substitutions
          ? [substitutions]
          : [];
      return entry.message.replace(/\$(\d+)/g, (_, index: string) => subs[Number(index) - 1] ?? '');
    }),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
});

beforeEach(() => {
  for (const key of Object.keys(memory)) {
    delete memory[key];
  }
  onChangedListeners.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  for (const key of Object.keys(memory)) {
    delete memory[key];
  }
  onChangedListeners.clear();
});
