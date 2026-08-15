import { t } from '@/i18n';
import { ContentMessages, sendBackgroundMessage } from '@/messages';
import { logger } from '@/utils/logger';
import { formatCountdown, getSecondsUntilMidnight } from '@/utils/time';

const OVERLAY_ID = 'time-shield-overlay';
const GRACE_BUTTON_ID = 'time-shield-grace';

function removeOverlay(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

// Listen for the background telling us to lift the block (e.g. grace granted).
chrome.runtime.onMessage.addListener((message: { message?: string }) => {
  if (message?.message === ContentMessages.unblock) {
    removeOverlay();
  }
});

function updateCountdown(container: HTMLElement): void {
  const countdownElement = container.querySelector<HTMLElement>('#ts-countdown');
  if (!countdownElement) return;

  const secondsRemaining = getSecondsUntilMidnight();
  countdownElement.textContent = formatCountdown(secondsRemaining);

  // Reload page at midnight to reset
  if (secondsRemaining <= 0) {
    window.location.reload();
  }
}

function createBlockedOverlay(): void {
  // Guard against duplicate overlay injection in the same tab
  if (document.getElementById(OVERLAY_ID)) return;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('contentHeading'));

  const style = document.createElement('style');
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: rgba(255, 255, 255, 0.92);
      color: #171717;
      animation: tsFadeIn 0.4s ease-out;
    }

    #${OVERLAY_ID} * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @keyframes tsFadeIn {
      from {
        opacity: 0;
        transform: translateY(-12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${OVERLAY_ID} {
        animation: none;
      }
    }

    #${OVERLAY_ID} .ts-container {
      text-align: center;
      max-width: 600px;
      width: 100%;
      background: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 24px;
      padding: 2.5rem 2rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
    }

    #${OVERLAY_ID} .ts-shield-icon {
      width: 96px;
      height: 96px;
      margin: 0 auto 1.5rem;
      background: #fef3c7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #${OVERLAY_ID} .ts-shield-icon svg {
      width: 48px;
      height: 48px;
      fill: #d97706;
    }

    #${OVERLAY_ID} h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    #${OVERLAY_ID} .ts-subtitle {
      font-size: 1.125rem;
      color: #4b5563;
      margin-bottom: 2rem;
    }

    #${OVERLAY_ID} .ts-countdown-container {
      border: 1px solid #e5e5e5;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    #${OVERLAY_ID} .ts-countdown-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    #${OVERLAY_ID} .ts-countdown {
      font-size: 3rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: #d97706;
    }

    #${OVERLAY_ID} .ts-message {
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    #${OVERLAY_ID} .ts-grace-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #d97706;
      background: #ffffff;
      color: #d97706;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.625rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    #${OVERLAY_ID} .ts-grace-btn:hover {
      background: #fef3c7;
    }

    #${OVERLAY_ID} .ts-grace-btn:disabled {
      opacity: 0.6;
      cursor: default;
    }

    #${OVERLAY_ID} .ts-grace-btn:focus-visible {
      outline: 2px solid #d97706;
      outline-offset: 2px;
    }

    #${OVERLAY_ID} .ts-footer {
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: #9ca3af;
    }

    @media (max-width: 640px) {
      #${OVERLAY_ID} h1 {
        font-size: 2rem;
      }

      #${OVERLAY_ID} .ts-countdown {
        font-size: 2rem;
      }

      #${OVERLAY_ID} .ts-subtitle {
        font-size: 1rem;
      }
    }
  `;
  overlay.appendChild(style);

  const container = document.createElement('div');
  container.className = 'ts-container';
  container.innerHTML = `
    <div class="ts-shield-icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>
    </div>

    <h1>${t('contentHeading')}</h1>

    <p class="ts-subtitle">${t('contentSubtitle')}</p>

    <div class="ts-countdown-container">
      <div class="ts-countdown-label">${t('contentCountdownLabel')}</div>
      <div class="ts-countdown" id="ts-countdown">--:--:--</div>
    </div>

    <p class="ts-message">
      ${t('contentMessage1')}<br>
      ${t('contentMessage2')}
    </p>

    <button type="button" class="ts-grace-btn" id="${GRACE_BUTTON_ID}">
      ${t('contentGrace')}
    </button>

    <div class="ts-footer">
      ${t('contentFooter')}
    </div>
  `;
  overlay.appendChild(container);

  // Never wipe the page DOM — the overlay sits on top and can be removed intact.
  document.documentElement.appendChild(overlay);

  const graceButton = container.querySelector<HTMLButtonElement>(`#${GRACE_BUTTON_ID}`);
  graceButton?.addEventListener('click', () => {
    graceButton.disabled = true;
    logger.debug('Grace requested from block overlay');
    sendBackgroundMessage('grace');
  });

  updateCountdown(container);
  window.setInterval(() => updateCountdown(container), 1000);
}

createBlockedOverlay();
