export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

export function secondsToMinutesAsText(seconds: number): string {
  if (typeof seconds !== 'number') return '';
  return String(seconds / 60);
}

export function formatTimeDisplay(seconds: number): string {
  const minutes = secondsToMinutes(seconds);
  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }
  return `${(minutes / 60).toFixed(1)}h`;
}

/**
 * Formats seconds as a human-readable duration ("45m", "1h 05m", "3h")
 * @param seconds - Duration in seconds
 * @returns Compact duration string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${String(remainder).padStart(2, '0')}m`;
}

export function formatBadgeText(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`;
}

/**
 * Calculates whole seconds elapsed between two timestamps
 * @param startTs - Start timestamp in milliseconds
 * @param nowTs - End timestamp in milliseconds (defaults to now)
 * @returns Whole seconds elapsed, never negative
 */
export function getElapsedSeconds(startTs: number, nowTs: number = Date.now()): number {
  const elapsed = Math.floor((nowTs - startTs) / 1000);
  return elapsed > 0 ? elapsed : 0;
}

/**
 * Formats a date as ISO string (YYYY-MM-DD)
 * @param date - Date object to format (defaults to current date)
 * @returns ISO formatted date string
 */
export function formatDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the current date in ISO format (YYYY-MM-DD)
 * @returns Current date as ISO string
 */
export function getCurrentDate(): string {
  return formatDateISO();
}

/**
 * Checks if the current date is different from the saved date
 * @param savedDate - Previously saved date in ISO format (YYYY-MM-DD)
 * @returns true if it's a new day, false otherwise
 */
export function isNewDay(savedDate: string | undefined): boolean {
  if (!savedDate) return true;
  const currentDate = getCurrentDate();
  return savedDate !== currentDate;
}

/**
 * Calculates seconds until midnight (start of next day)
 * @returns Number of seconds until midnight
 */
export function getSecondsUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

/**
 * Formats seconds into a human-readable countdown (HH:MM:SS)
 * @param seconds - Number of seconds
 * @returns Formatted time string
 */
export function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
