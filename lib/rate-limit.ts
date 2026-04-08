import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  code?: string;
  message?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __servnestRateLimitStore?: Map<string, RateLimitEntry>;
};

function getStore() {
  if (!globalStore.__servnestRateLimitStore) {
    globalStore.__servnestRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalStore.__servnestRateLimitStore;
}

function pruneExpiredEntries(now: number) {
  const store = getStore();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function resetRateLimitStoreForTests() {
  getStore().clear();
}

export function enforceRateLimit({
  key,
  limit,
  windowMs,
  code = "RATE_LIMITED",
  message = "Too many requests. Please wait and try again.",
}: RateLimitOptions) {
  const now = Date.now();
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    pruneExpiredEntries(now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { code, error: message },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  current.count += 1;
  store.set(key, current);
  return null;
}
