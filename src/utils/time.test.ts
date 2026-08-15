import { describe, expect, it } from 'vitest';
import {
  formatBadgeText,
  formatCountdown,
  formatDateISO,
  formatDuration,
  formatTimeDisplay,
  getElapsedSeconds,
  isNewDay,
} from './time';

describe('getElapsedSeconds', () => {
  it('returns whole seconds between timestamps', () => {
    expect(getElapsedSeconds(1_000_000_000, 1_000_010_000)).toBe(10);
  });

  it('returns zero for negative elapsed time', () => {
    expect(getElapsedSeconds(1_000_010_000, 1_000_000_000)).toBe(0);
  });

  it('floors fractional seconds down', () => {
    expect(getElapsedSeconds(1_000_000_000, 1_000_000_999)).toBe(0);
    expect(getElapsedSeconds(1_000_000_000, 1_000_001_500)).toBe(1);
  });
});

describe('formatBadgeText', () => {
  it('formats seconds as minutes', () => {
    expect(formatBadgeText(0)).toBe('0m');
    expect(formatBadgeText(3599)).toBe('59m');
    expect(formatBadgeText(3600)).toBe('60m');
  });
});

describe('formatCountdown', () => {
  it('formats HH:MM:SS', () => {
    expect(formatCountdown(3661)).toBe('01:01:01');
  });
});

describe('formatTimeDisplay', () => {
  it('formats minutes under an hour', () => {
    expect(formatTimeDisplay(300)).toBe('5m');
  });

  it('formats hours at or above an hour', () => {
    expect(formatTimeDisplay(3600)).toBe('1.0h');
  });
});

describe('formatDuration', () => {
  it('formats minutes under an hour', () => {
    expect(formatDuration(300)).toBe('5m');
  });

  it('formats whole hours', () => {
    expect(formatDuration(7200)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3900)).toBe('1h 05m');
  });
});

describe('formatDateISO / isNewDay', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDateISO(new Date(2026, 7, 14))).toBe('2026-08-14');
  });

  it('detects a new day', () => {
    expect(isNewDay('2020-01-01')).toBe(true);
    expect(isNewDay(undefined)).toBe(true);
    expect(isNewDay(formatDateISO(new Date()))).toBe(false);
  });
});
