export interface RestrictedSite {
  url: string;
  totalSeconds: number;
  todaySeconds: number;
}

export interface StorageData {
  restrictedSites: string[];
  maxAllowedTime: number;
  remainingTime: number;
  pausedUntil: number | null;
  onboardingDone: boolean;
  today: string;
  disabled: number | boolean;
  isNewDay: boolean;
}

export interface TimeInfo {
  today: number;
  total: number;
}
