interface Window {
  timestamps: number[];
}

const store = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const storeKey = `${key}:${limit}:${windowMs}`;
  const win = store.get(storeKey) ?? { timestamps: [] };

  win.timestamps = win.timestamps.filter((t) => t > now - windowMs);

  if (win.timestamps.length >= limit) {
    const retryAfterMs = win.timestamps[0] + windowMs - now;
    store.set(storeKey, win);
    return { allowed: false, retryAfterMs };
  }

  win.timestamps.push(now);
  store.set(storeKey, win);
  return { allowed: true, retryAfterMs: 0 };
}
