import { useEffect, useState } from 'react';

export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => Promise<void>] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);

  useEffect(() => {
    // Load initial value
    chrome.storage.local.get([key], (result) => {
      if (result[key] !== undefined) {
        setStoredValue(result[key] as T);
      }
    });

    // Listen for changes
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName === 'local' && changes[key]) {
        setStoredValue(changes[key].newValue as T);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [key]);

  const setValue = async (value: T): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
    setStoredValue(value);
  };

  return [storedValue, setValue];
}
