import { t } from '@/i18n';
import type { TimeInfo } from '@/types';
import { formatDuration } from '@/utils/time';

interface SiteCardProps {
  site: string;
  timeInfo: TimeInfo;
  onRemove: (site: string) => void;
  disabled?: boolean;
}

export function SiteCard({ site, timeInfo, onRemove, disabled = false }: SiteCardProps) {
  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={`https://www.google.com/s2/favicons?domain=${site}`}
            alt=""
            className="h-4 w-4 shrink-0"
          />
          <span className="truncate text-sm font-medium text-gray-900">{site}</span>
        </div>
        <button
          onClick={() => onRemove(site)}
          disabled={disabled}
          type="button"
          aria-label={t('removeSiteAria', [site])}
          title={t('removeSite')}
          className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {timeInfo.today > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {t('todayUsage', [formatDuration(timeInfo.today)])}
          </span>
        ) : (
          <span className="text-gray-500">{t('zeroToday')}</span>
        )}
        <span className="truncate text-gray-600">
          {t('totalUsage', [formatDuration(timeInfo.total)])}
        </span>
      </div>
    </li>
  );
}

interface IconProps {
  className?: string;
}

function TrashIcon({ className = 'h-4 w-4' }: IconProps) {
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
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}
