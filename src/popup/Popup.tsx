import { updateBadge } from '@/background/badge';
import { SiteCard } from '@/components/SiteCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBackgroundMessage } from '@/hooks/useBackgroundMessage';
import { useStorage } from '@/hooks/useStorage';
import { t } from '@/i18n';
import '@/index.css';
import type { TimeInfo } from '@/types';
import { logger } from '@/utils/logger';
import { extractHostname, normalizeSiteInput } from '@/utils/matching';
import {
  formatCountdown,
  formatDuration,
  getCurrentDate,
  getSecondsUntilMidnight,
  minutesToSeconds,
  secondsToMinutesAsText,
} from '@/utils/time';
import { useEffect, useRef, useState } from 'react';

const SUGGESTED_SITES = [
  'youtube.com',
  'facebook.com',
  'x.com',
  'reddit.com',
  'instagram.com',
  'tiktok.com',
];

const PAUSE_15M_MS = 15 * 60 * 1000;
const PAUSE_1H_MS = 60 * 60 * 1000;

export function Popup() {
  const [restrictedSites, setRestrictedSites] = useStorage<string[]>('restrictedSites', []);
  const [maxAllowedTime, setMaxAllowedTime] = useStorage<number>('maxAllowedTime', 0);
  const [remainingTime] = useStorage<number | null>('remainingTime', null);
  const [disabled, setDisabled] = useStorage<number | boolean>('disabled', false);
  const [pausedUntil, setPausedUntil] = useStorage<number | null>('pausedUntil', null);
  const [onboardingDone, setOnboardingDone] = useStorage<boolean>('onboardingDone', false);

  const [urlInput, setUrlInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlHint, setUrlHint] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [siteTimeInfo, setSiteTimeInfo] = useState<Record<string, TimeInfo>>({});
  const [timeToMidnight, setTimeToMidnight] = useState(getSecondsUntilMidnight());
  const [now, setNow] = useState(Date.now());
  const [currentTabSite, setCurrentTabSite] = useState<string | null>(null);

  const savedTimer = useRef<number | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const { sendMessage } = useBackgroundMessage();
  const today = getCurrentDate();
  const isLocked = disabled === true;
  const countdown = formatCountdown(timeToMidnight);
  const lockedBanner = t('lockedBanner', [countdown]);
  const [lockedBannerStart, lockedBannerEnd] = lockedBanner.split(countdown);
  const isPaused = pausedUntil !== null && pausedUntil > now;
  const pauseSecondsLeft =
    pausedUntil !== null ? Math.max(0, Math.floor((pausedUntil - now) / 1000)) : 0;
  const showOnboarding = !onboardingDone;

  useEffect(() => {
    setTimeInput(maxAllowedTime > 0 ? secondsToMinutesAsText(maxAllowedTime) : '');
  }, [maxAllowedTime]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSites(true);

    const load = async () => {
      try {
        const info: Record<string, TimeInfo> = {};

        for (const site of restrictedSites) {
          const siteData = await chrome.storage.local.get([site, `${site}_${today}`]);
          info[site] = {
            total: siteData[site] || 0,
            today: siteData[`${site}_${today}`] || 0,
          };
        }

        if (!cancelled) setSiteTimeInfo(info);
      } catch (error) {
        logger.error('Failed to load site time info:', error);
        if (!cancelled) setSiteTimeInfo({});
      } finally {
        if (!cancelled) setLoadingSites(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [restrictedSites, today]);

  useEffect(() => {
    if (disabled !== true) return;
    const id = window.setInterval(() => setTimeToMidnight(getSecondsUntilMidnight()), 1000);
    return () => window.clearInterval(id);
  }, [disabled]);

  useEffect(() => {
    if (pausedUntil === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pausedUntil]);

  useEffect(() => {
    return () => {
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (cancelled) return;
        const rawUrl = tab?.url;
        if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
          setCurrentTabSite(null);
          return;
        }
        setCurrentTabSite((extractHostname(rawUrl) ?? '').replace(/^www\./, '') || null);
      })
      .catch(() => {
        if (!cancelled) setCurrentTabSite(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showSaved = () => {
    setSaved(true);
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
  };

  const handleUrlBlur = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError(null);
      setUrlHint(null);
      return;
    }
    const url = normalizeSiteInput(urlInput);
    if (!url) {
      setUrlError(t('urlNotRecognized', [trimmed]));
      setUrlHint(null);
      return;
    }
    if (restrictedSites.includes(url)) {
      setUrlHint(t('urlAlreadyRestricted', [url]));
      setUrlError(null);
      return;
    }
    setUrlError(null);
    setUrlHint(null);
  };

  const handleAddCurrentSite = () => {
    if (!currentTabSite) return;
    setUrlInput(currentTabSite);
    setUrlError(null);
    setUrlHint(null);
    urlInputRef.current?.focus();
  };

  const handleTimeBlur = () => {
    if (!timeInput.trim()) {
      setTimeError(null);
      return;
    }
    const value = Number.parseInt(timeInput, 10);
    if (Number.isNaN(value) || value < 1 || value > 1440) {
      setTimeError(t('limitRangeError'));
    } else {
      setTimeError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    const url = getUrl();
    const trimmedUrl = urlInput.trim();
    let valid = true;

    if (trimmedUrl && !url) {
      setUrlError(t('urlNotRecognized', [trimmedUrl]));
      valid = false;
    } else {
      setUrlError(null);
    }

    const timeValue = Number.parseInt(timeInput, 10);
    if (!timeInput.trim() || Number.isNaN(timeValue)) {
      setTimeError(t('enterDailyLimit'));
      valid = false;
    } else if (timeValue < 1 || timeValue > 1440) {
      setTimeError(t('limitRangeError'));
      valid = false;
    } else {
      setTimeError(null);
    }

    if (!valid) return;

    try {
      if (url && !restrictedSites.includes(url)) {
        await setRestrictedSites([...restrictedSites, url]);
        setUrlInput('');
      }

      const maxAllowedSeconds = minutesToSeconds(timeValue);

      if (maxAllowedSeconds !== maxAllowedTime) {
        // Global limit changed: reset today's remaining to the new limit
        await chrome.storage.local.set({ remainingTime: maxAllowedSeconds });
        await setMaxAllowedTime(maxAllowedSeconds);
        if (maxAllowedSeconds) {
          updateBadge(maxAllowedSeconds);
        }
      }

      sendMessage('updateTimer');
      showSaved();
    } catch (error) {
      logger.error('Failed to save settings:', error);
    }
  };

  const handleLock = async () => {
    await setDisabled(true);
    setShowLockDialog(false);
  };

  const handleRemoveSite = async (site: string) => {
    const newSites = restrictedSites.filter((s) => s !== site);
    await setRestrictedSites(newSites);
    sendMessage('updateTimer');
  };

  const pauseFor = async (ms: number) => {
    setShowPauseMenu(false);
    await setPausedUntil(Date.now() + ms);
    sendMessage('updateTimer');
  };

  const pauseUntilTomorrow = async () => {
    setShowPauseMenu(false);
    const ms = getSecondsUntilMidnight() * 1000;
    await setPausedUntil(Date.now() + ms);
    sendMessage('updateTimer');
  };

  const handleResume = async () => {
    await setPausedUntil(null);
    sendMessage('updateTimer');
  };

  const addSuggested = async (site: string) => {
    if (restrictedSites.includes(site)) return;
    await setRestrictedSites([...restrictedSites, site]);
    sendMessage('updateTimer');
  };

  const finishOnboarding = async () => {
    await setOnboardingDone(true);
  };

  const getUrl = (): string => {
    return normalizeSiteInput(urlInput);
  };

  const hasLimit = maxAllowedTime > 0;
  const remaining = hasLimit ? Math.max(0, remainingTime ?? maxAllowedTime) : 0;
  const usedToday = hasLimit
    ? Math.min(maxAllowedTime, Math.max(0, maxAllowedTime - remaining))
    : 0;
  const usedPercent = hasLimit ? Math.min(100, (usedToday / maxAllowedTime) * 100) : 0;
  const barClass =
    usedPercent >= 100
      ? '[&::-webkit-progress-value]:bg-red-500'
      : usedPercent >= 80
        ? '[&::-webkit-progress-value]:bg-amber-500'
        : '[&::-webkit-progress-value]:bg-emerald-500';

  return (
    <div className="w-[360px] bg-white p-4">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/shield.png" alt="Time Shield logo" className="h-8 w-8" />
          <h1 className="text-lg font-bold text-gray-900">Time Shield</h1>
        </div>
        <div className="flex items-center gap-2">
          {isPaused && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
              <PauseIcon className="h-3.5 w-3.5" />
              {t('statusPaused')}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isLocked ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isLocked ? (
              <LockIcon className="h-3.5 w-3.5" />
            ) : (
              <UnlockIcon className="h-3.5 w-3.5" />
            )}
            {isLocked ? t('statusLocked') : t('statusUnlocked')}
          </span>
        </div>
      </header>

      {isLocked && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            {lockedBannerStart}
            <span className="font-semibold tabular-nums text-amber-700">{countdown}</span>
            {lockedBannerEnd}
          </p>
        </div>
      )}

      {isPaused && (
        <div className="mb-4 flex items-center justify-between gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3">
          <div className="flex items-start gap-2.5">
            <PauseIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p className="text-sm text-sky-900">
              {t('pausedBanner', [formatCountdown(pauseSecondsLeft)])}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResume}
            className="shrink-0 rounded-md border border-sky-300 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            {t('resume')}
          </button>
        </div>
      )}

      <section className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
        {hasLimit ? (
          <>
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('remainingToday')}
                </p>
                <p className="text-2xl font-bold text-amber-600">{formatDuration(remaining)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('dailyLimit')}
                </p>
                <p className="text-lg font-semibold text-gray-600">
                  {formatDuration(maxAllowedTime)}
                </p>
              </div>
            </div>
            <progress
              max={100}
              value={Math.round(usedPercent)}
              aria-label={t('dailyLimitUsage')}
              className={`h-2 w-full overflow-hidden rounded-full bg-neutral-200 [&::-webkit-progress-bar]:bg-neutral-200 [&::-webkit-progress-value]:rounded-full ${barClass}`}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {usedPercent >= 100
                  ? t('limitReached')
                  : t('usedToday', [formatDuration(usedToday)])}
              </p>
              {!isPaused && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPauseMenu((v) => !v)}
                    disabled={isLocked}
                    aria-expanded={showPauseMenu}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <PauseIcon className="h-3.5 w-3.5" />
                    {t('pause')}
                  </button>
                  {showPauseMenu && (
                    <div
                      role="menu"
                      className="absolute bottom-full right-0 z-10 mb-1 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => pauseFor(PAUSE_15M_MS)}
                        className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-neutral-50"
                      >
                        {t('pause15min')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => pauseFor(PAUSE_1H_MS)}
                        className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-neutral-50"
                      >
                        {t('pause1h')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={pauseUntilTomorrow}
                        className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-neutral-50"
                      >
                        {t('pauseUntilTomorrow')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            {t('noLimitSet')}{' '}
            <span className="font-medium text-gray-900">{t('noLimitSetCta')}</span>{' '}
            {t('noLimitSetTail')}
          </p>
        )}
      </section>

      {showOnboarding && (
        <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-gray-900">{t('onboardingTitle')}</h2>
          <p className="mt-1 text-sm text-gray-600">{t('onboardingDescription')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_SITES.map((site) => (
              <button
                key={site}
                type="button"
                onClick={() => addSuggested(site)}
                aria-pressed={restrictedSites.includes(site)}
                className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                {restrictedSites.includes(site) ? `${site} ✓` : site}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={finishOnboarding}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {t('onboardingFinish')}
          </button>
          <button
            type="button"
            onClick={finishOnboarding}
            className="ml-2 text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
          >
            {t('skipOnboarding')}
          </button>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mb-4 space-y-3 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
            <PlusIcon className="h-3 w-3 text-amber-700" />
          </span>
          <h2 className="text-sm font-semibold text-gray-900">{t('addSite')}</h2>
        </div>
        <div>
          <label htmlFor="url" className="mb-1 block text-sm font-medium text-gray-700">
            {t('websiteToLimit')}
          </label>
          <Input
            id="url"
            ref={urlInputRef}
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder={t('urlPlaceholder')}
            disabled={isLocked}
            aria-invalid={urlError ? true : undefined}
            aria-describedby={urlError ? 'url-error' : urlHint ? 'url-hint' : undefined}
          />
          {currentTabSite && (
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm text-gray-500">
                {t('currentTabHint', [currentTabSite])}
              </p>
              {!restrictedSites.includes(currentTabSite) && (
                <button
                  type="button"
                  onClick={handleAddCurrentSite}
                  disabled={isLocked}
                  className="shrink-0 rounded-md border border-neutral-200 px-2 py-0.5 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40"
                >
                  {t('addCurrentSite')}
                </button>
              )}
            </div>
          )}
          {urlError && (
            <p id="url-error" role="alert" className="mt-1 text-sm text-red-600">
              {urlError}
            </p>
          )}
          {!urlError && urlHint && (
            <p id="url-hint" className="mt-1 text-sm text-amber-600">
              {urlHint}
            </p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="time" className="mb-1 block text-sm font-medium text-gray-700">
              {t('dailyLimit')}
            </label>
            <div className="relative">
              <Input
                id="time"
                type="number"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                onBlur={handleTimeBlur}
                placeholder="60"
                min="1"
                max="1440"
                disabled={isLocked}
                className="pr-12"
                aria-invalid={timeError ? true : undefined}
                aria-describedby={timeError ? 'time-error' : 'time-hint'}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                {t('minUnit')}
              </span>
            </div>
            {timeError && (
              <p id="time-error" role="alert" className="mt-1 text-sm text-red-600">
                {timeError}
              </p>
            )}
            {!timeError && (
              <p id="time-hint" className="mt-1 text-sm text-gray-500">
                {t('limitHint')}
              </p>
            )}
          </div>
          {saved ? (
            <Button type="submit" disabled={isLocked} variant="success" className="h-10 gap-1.5">
              <CheckIcon className="h-4 w-4" />
              {t('saved')}
            </Button>
          ) : (
            <Button type="submit" disabled={isLocked} className="h-10">
              {t('save')}
            </Button>
          )}
        </div>
      </form>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t('restrictedSites')}</h2>
          {restrictedSites.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {restrictedSites.length}
            </span>
          )}
        </div>
        {loadingSites && restrictedSites.length > 0 ? (
          <ul className="space-y-2" aria-label={t('loadingRestrictedSites')}>
            {[0, 1].map((i) => (
              <li
                key={i}
                className="animate-pulse rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-200" />
                </div>
                <div className="h-3 w-32 rounded bg-gray-200" />
              </li>
            ))}
          </ul>
        ) : restrictedSites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-8 text-center">
            <ShieldIcon className="mx-auto mb-2 h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium text-gray-900">{t('noRestrictedSites')}</p>
            <p className="mt-1 text-sm text-gray-500">{t('noRestrictedSitesHint')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {restrictedSites.map((site) => (
              <SiteCard
                key={site}
                site={site}
                timeInfo={siteTimeInfo[site] || { today: 0, total: 0 }}
                onRemove={handleRemoveSite}
                disabled={isLocked}
              />
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3">
        <button
          type="button"
          onClick={() => setShowLockDialog(true)}
          disabled={isLocked}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-gray-600 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-40"
        >
          <LockIcon className="h-4 w-4" />
          {isLocked ? t('timeLocked') : t('lockTime')}
        </button>
        <a
          href={chrome.runtime.getURL('src/options/index.html')}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          <SettingsIcon className="h-4 w-4" />
          {t('settings')}
        </a>
      </footer>

      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <WarningIcon className="h-5 w-5 text-amber-700" />
              </span>
              {t('dialogWarning')}
            </span>
          </DialogTitle>
          <DialogDescription>{t('lockWarning')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setShowLockDialog(false)}>
            {t('cancel')}
          </Button>
          <Button variant="warning" onClick={handleLock}>
            {t('confirmLock')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

interface IconProps {
  className?: string;
}

function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function PauseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  );
}

function LockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function UnlockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function WarningIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

function PlusIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ShieldIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"
      />
    </svg>
  );
}

function SettingsIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124a6.52 6.52 0 0 1 .22-.128c.332-.183.582-.495.644-.869l.214-1.281Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
