import { logger } from '@/utils/logger';

export const WorkerMessages = {
  updateTimer: 'updateTimer',
  start: 'start',
  grace: 'grace',
  error: 'error',
} as const;

export type WorkerMessage = (typeof WorkerMessages)[keyof typeof WorkerMessages];

export const ContentMessages = {
  unblock: 'timeShieldUnblock',
} as const;

export type ContentMessage = (typeof ContentMessages)[keyof typeof ContentMessages];

export interface ErrorMessage {
  message: typeof WorkerMessages.error;
  error: string;
  context: string;
}

export function sendBackgroundMessage(message: WorkerMessage): void {
  chrome.runtime.sendMessage({ message });
}

export function sendContentMessage(tabId: number, message: ContentMessage): void {
  chrome.tabs.sendMessage(tabId, { message }).catch(() => {
    // No receiver (tab closed or content script not present) — safe to ignore.
  });
}

export function notifyBackgroundError(error: unknown, context: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Error in ${context}:`, error);
  chrome.runtime.sendMessage({ message: WorkerMessages.error, error: errorMessage, context });
}
