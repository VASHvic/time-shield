interface I18nAPI {
  getMessage: (key: string, substitutions?: string | string[]) => string;
}

function getI18n(): I18nAPI | undefined {
  const globalChrome = (globalThis as { chrome?: { i18n?: Partial<I18nAPI> } }).chrome;
  return globalChrome?.i18n?.getMessage ? (globalChrome.i18n as I18nAPI) : undefined;
}

export function t(key: string, substitutions?: string | string[]): string {
  const api = getI18n();
  if (api) {
    const message = api.getMessage(key, substitutions);
    if (message) return message;
  }
  return key;
}
