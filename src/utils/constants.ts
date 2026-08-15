export const CONSTANTS = {
  ALARM_NAME: 'timeShieldAlarm',
  CHECK_INTERVAL: 10000, // 10 seconds
  STORAGE_KEYS: {
    RESTRICTED_SITES: 'restrictedSites',
    MAX_ALLOWED_TIME: 'maxAllowedTime',
    REMAINING_TIME: 'remainingTime',
    PAUSED_UNTIL: 'pausedUntil',
    ONBOARDING_DONE: 'onboardingDone',
    TODAY: 'today',
    DISABLED: 'disabled',
    IS_NEW_DAY: 'isNewDay',
    ACTIVE_SITE: 'activeSite',
    ACTIVE_SINCE_TS: 'activeSinceTs',
  },
} as const;

export const Colors = {
  blue: '#0000FF',
  red: '#FF0000',
  green: '#00FF00',
} as const;
