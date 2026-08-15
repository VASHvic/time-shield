import { describe, expect, it } from 'vitest';
import { extractHostname, matchRestrictedSite, normalizeSiteInput } from './matching';

describe('extractHostname', () => {
  it('extracts the hostname from a full URL', () => {
    expect(extractHostname('https://www.youtube.com/watch?v=1')).toBe('www.youtube.com');
  });

  it('lowercases the hostname', () => {
    expect(extractHostname('HTTPS://YOUTUBE.COM/VIDEO')).toBe('youtube.com');
  });

  it('returns null for invalid URLs', () => {
    expect(extractHostname('not a url')).toBeNull();
    expect(extractHostname('')).toBeNull();
  });
});

describe('normalizeSiteInput', () => {
  it('keeps bare words as-is (legacy format)', () => {
    expect(normalizeSiteInput('youtube')).toBe('youtube');
  });

  it('keeps plain domains', () => {
    expect(normalizeSiteInput('youtube.com')).toBe('youtube.com');
  });

  it('strips www and lowercases', () => {
    expect(normalizeSiteInput('www.YOUTUBE.com')).toBe('youtube.com');
  });

  it('extracts hostname from full URLs', () => {
    expect(normalizeSiteInput('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
  });

  it('keeps subdomains', () => {
    expect(normalizeSiteInput('news.bbc.co.uk')).toBe('news.bbc.co.uk');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeSiteInput('   ')).toBe('');
  });
});

describe('matchRestrictedSite', () => {
  it('matches exact hostname keys', () => {
    expect(matchRestrictedSite('youtube.com', 'youtube.com')).toBe(true);
  });

  it('matches subdomains of a hostname key', () => {
    expect(matchRestrictedSite('m.youtube.com', 'youtube.com')).toBe(true);
    expect(matchRestrictedSite('www.youtube.com', 'youtube.com')).toBe(true);
  });

  it('does not match different domains', () => {
    expect(matchRestrictedSite('youtube-downloader.com', 'youtube.com')).toBe(false);
    expect(matchRestrictedSite('xoutube.com', 'youtube.com')).toBe(false);
  });

  it('matches legacy bare-word keys against the first label', () => {
    expect(matchRestrictedSite('youtube.com', 'youtube')).toBe(true);
    expect(matchRestrictedSite('www.youtube.com', 'youtube')).toBe(true);
    expect(matchRestrictedSite('youtube-downloader.com', 'youtube')).toBe(false);
  });

  it('supports wildcard keys', () => {
    expect(matchRestrictedSite('youtube.com', '*.youtube.com')).toBe(true);
    expect(matchRestrictedSite('m.youtube.com', '*.youtube.com')).toBe(true);
    expect(matchRestrictedSite('youtube.com.au', '*.youtube.com')).toBe(false);
  });

  it('strips scheme/www from the site key', () => {
    expect(matchRestrictedSite('youtube.com', 'https://www.youtube.com')).toBe(true);
  });

  it('returns false for null hostnames', () => {
    expect(matchRestrictedSite(null, 'youtube.com')).toBe(false);
  });

  it('returns false for empty keys', () => {
    expect(matchRestrictedSite('youtube.com', '')).toBe(false);
  });
});
