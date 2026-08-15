import { Colors } from '@/utils/constants';
import { formatBadgeText } from '@/utils/time';

export const WARNING_THRESHOLD_SECONDS = 5 * 60;

export function updateBadge(currentSeconds: number): void {
  chrome.action.setBadgeText({
    text: formatBadgeText(currentSeconds),
  });
  chrome.action.setBadgeBackgroundColor({
    color: currentSeconds < WARNING_THRESHOLD_SECONDS ? Colors.red : Colors.blue,
  });
}

export function setBadgeColor(color: string): void {
  chrome.action.setBadgeBackgroundColor({ color });
}
