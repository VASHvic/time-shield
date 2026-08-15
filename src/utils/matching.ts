/**
 * Extracts the hostname from a URL string
 * @param url - Full URL (e.g. "https://www.youtube.com/watch?v=1")
 * @returns Lowercased hostname, or null if the URL is invalid
 */
export function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Normalizes user input into a site match key
 * - "youtube.com" -> "youtube.com"
 * - "www.YOUTUBE.com" -> "youtube.com"
 * - "https://youtube.com/watch?v=1" -> "youtube.com"
 * - "youtube" (no dot) -> "youtube" (legacy bare-word format)
 */
export function normalizeSiteInput(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  if (!trimmed.includes('.')) return trimmed;

  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return trimmed;
  }
}

function normalizeKey(key: string): string {
  const withoutScheme = key.toLowerCase().replace(/^https?:\/\//, '');
  const hostPart = withoutScheme.split('/')[0] ?? '';
  return hostPart.replace(/^www\./, '');
}

/**
 * Checks whether a page hostname matches a restricted site key.
 * Supports:
 * - Full hostnames ("youtube.com" matches "youtube.com" and subdomains)
 * - Wildcards ("*.youtube.com")
 * - Legacy bare-word keys ("youtube" matches the first label of the hostname)
 */
export function matchRestrictedSite(hostname: string | null, siteKey: string): boolean {
  if (!hostname) return false;
  const host = hostname.replace(/^www\./, '');
  const key = normalizeKey(siteKey);
  if (!key) return false;

  if (key.startsWith('*.')) {
    const base = key.slice(2);
    return host === base || host.endsWith(`.${base}`);
  }

  if (key.includes('.')) {
    return host === key || host.endsWith(`.${key}`);
  }

  return host.split('.')[0] === key;
}
