// Minimal in-memory rate limiter for login attempts. Keyed by identifier
// (phone). This is per-process — good enough to blunt online guessing/credential
// stuffing on a single instance; for multi-instance production, back it with a
// shared store (Redis) instead.

type Entry = { count: number; first: number; blockedUntil?: number };

const WINDOW_MS = 15 * 60 * 1000; // rolling window for counting failures
const MAX_FAILURES = 8; // failures within the window before a block
const BLOCK_MS = 15 * 60 * 1000; // how long a block lasts

const attempts = new Map<string, Entry>();

// Opportunistically drop stale entries so the map can't grow without bound.
function prune(now: number) {
  if (attempts.size < 5000) return;
  for (const [key, e] of attempts) {
    const expired = now - e.first > WINDOW_MS && (!e.blockedUntil || e.blockedUntil < now);
    if (expired) attempts.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterMs?: number };

/** Check whether an attempt for `key` is currently allowed (does not mutate). */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const e = attempts.get(key);
  if (!e) return { allowed: true };
  if (e.blockedUntil && e.blockedUntil > now) {
    return { allowed: false, retryAfterMs: e.blockedUntil - now };
  }
  return { allowed: true };
}

/** Record a failed attempt for `key`, blocking once the threshold is crossed. */
export function recordFailure(key: string): void {
  const now = Date.now();
  prune(now);
  const e = attempts.get(key);
  if (!e || now - e.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return;
  }
  e.count += 1;
  if (e.count >= MAX_FAILURES) e.blockedUntil = now + BLOCK_MS;
}

/** Clear the counter for `key` after a successful login. */
export function recordSuccess(key: string): void {
  attempts.delete(key);
}
