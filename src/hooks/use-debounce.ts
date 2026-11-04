import { useEffect, useState } from 'react';

/**
 * useDebounce hook
 * Kiritilayotgan qiymatni belgilangan vaqt (delay ms) davomida
 * kechiktirib qaytaradi (ortiqcha backend so'rovlarining oldini oladi).
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
