import '@/index.css';
import { t } from '@/i18n';

export function Options() {
  return (
    <div className="min-h-screen bg-primary-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center gap-3">
          <img src="/shield.png" alt="Time Shield logo" className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Shield</h1>
            <p className="text-sm text-gray-500">{t('options')}</p>
          </div>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('settings')}</h2>
          <p className="text-gray-600">{t('optionsDescription')}</p>
        </section>

        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('supportTitle')}</h2>
          <p className="mb-4 text-gray-600">{t('supportDescription')}</p>
          <a
            href="https://github.com/VASHvic/time-shield/blob/main/DONATIONS.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {t('supportDonate')}
          </a>
        </section>

        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('about')}</h2>
          <p className="mb-4 text-gray-600">{t('aboutDescription')}</p>
          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline gap-2">
              <dt className="font-semibold text-gray-900">{t('version')}</dt>
              <dd>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  1.0.0
                </span>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-semibold text-gray-900">{t('privacy')}</dt>
              <dd className="text-gray-600">{t('privacyValue')}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-semibold text-gray-900">{t('github')}</dt>
              <dd>
                <a
                  href="https://github.com/VASHvic/time-shield"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 transition-colors hover:text-amber-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900 focus-visible:ring-offset-2"
                >
                  VASHvic/time-shield
                </a>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
