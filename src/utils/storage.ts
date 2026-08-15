import { logger } from '@/utils/logger';
import { getCurrentDate } from '@/utils/time';

type StorageArea = typeof chrome.storage.local;

export function getUsageKeys(
  site: string,
  date: string = getCurrentDate(),
): {
  totalKey: string;
  dailyKey: string;
} {
  return { totalKey: site, dailyKey: `${site}_${date}` };
}

export class StorageService {
  private storage: StorageArea;

  constructor(storage: StorageArea) {
    this.storage = storage;
  }

  async get<T>(keys?: string | string[] | null): Promise<T> {
    try {
      if (keys === undefined || keys === null) {
        const result = await this.storage.get(null);
        return result as T;
      }
      if (typeof keys === 'string') {
        const result = await this.storage.get([keys]);
        return result as T;
      }
      const result = await this.storage.get(keys);
      return result as T;
    } catch (error) {
      logger.error('StorageService.get error:', error);
      throw error;
    }
  }

  async set(values: Record<string, unknown>): Promise<void> {
    try {
      await this.storage.set(values);
    } catch (error) {
      logger.error('StorageService.set error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.storage.clear();
    } catch (error) {
      logger.error('StorageService.clear error:', error);
      throw error;
    }
  }

  async printStorage(): Promise<void> {
    try {
      const data = await this.storage.get(null);
      logger.debug('Storage data:', data);
    } catch (error) {
      logger.error('StorageService.printStorage error:', error);
    }
  }
}

export const chromeStorageService = new StorageService(chrome.storage.local);
