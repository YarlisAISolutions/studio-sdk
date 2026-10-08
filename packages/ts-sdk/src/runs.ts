/**
 * Run-status vocabulary shared by workflow runs and agent runs, plus the
 * polling backoff both waiters use.
 */

/**
 * Lifecycle of a run row. `completed`, `failed` and `cancelled` are terminal;
 * `pending`/`queued`/`running` are in flight, and `paused` is a human-in-the-loop
 * run waiting for an approval (it stays non-terminal, so a waiter times out).
 */
export type RunStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export const TERMINAL_RUN_STATUSES: readonly RunStatus[] = ['completed', 'failed', 'cancelled']

export function isTerminalRunStatus(status: string | undefined | null): boolean {
  return !!status && (TERMINAL_RUN_STATUSES as readonly string[]).includes(status)
}

/** First poll delay, and the cap the delay doubles up to. */
export const POLL_INITIAL_DELAY_MS = 500
export const POLL_MAX_DELAY_MS = 2000

/** 500ms → 1s → 2s → 2s … */
export function nextPollDelay(current: number): number {
  return Math.min(current * 2, POLL_MAX_DELAY_MS)
}

export type Sleep = (ms: number) => Promise<void>

const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Injectable time source so waiters are testable without real timers. */
export interface Clock {
  now: () => number
  sleep: Sleep
}

export const systemClock: Clock = { now: () => Date.now(), sleep: defaultSleep }

/**
 * Sleep with backoff, then call `read`, until it reports a terminal status or
 * `deadline` (epoch ms) passes. The last sleep is trimmed to land on the
 * deadline and is followed by one final read. Returns the terminal value, or
 * `undefined` on deadline — the caller owns the timeout error so its message
 * can name the run.
 */
export async function pollUntilTerminal<T extends { status: string }>(
  read: () => Promise<T>,
  deadline: number,
  clock: Clock = systemClock
): Promise<T | undefined> {
  let delay = POLL_INITIAL_DELAY_MS
  while (deadline - clock.now() > 0) {
    await clock.sleep(Math.min(delay, Math.max(0, deadline - clock.now())))
    const value = await read()
    if (isTerminalRunStatus(value.status)) return value
    delay = nextPollDelay(delay)
  }
  return undefined
}
