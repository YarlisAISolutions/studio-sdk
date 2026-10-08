/**
 * SDK error types. Kept in their own module so `index.ts` and `agents.ts` can
 * both throw them without an import cycle.
 */

export class MyBotBoxError extends Error {
  public code?: string
  public status?: number

  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = 'MyBotBoxError'
    this.code = code
    this.status = status
  }
}

/**
 * Thrown when the token is missing/expired/invalid (HTTP 401). Re-authenticate
 * with `MyBotBoxClient.login()` (or set a fresh `MYBOTBOX_TOKEN`).
 */
export class AuthExpiredError extends MyBotBoxError {
  constructor(message = 'Your credentials have expired. Run device login to re-authenticate.') {
    super(message, 'AUTH_EXPIRED', 401)
    this.name = 'AuthExpiredError'
  }
}

/** True when an error is an expired/invalid-credentials (401) error. */
export function isAuthExpired(error: unknown): error is MyBotBoxError {
  return error instanceof MyBotBoxError && error.status === 401
}

/** Build the right error for an HTTP status (401 → AuthExpiredError). */
export function httpError(status: number, message: string, code?: string): MyBotBoxError {
  if (status === 401) return new AuthExpiredError(message)
  return new MyBotBoxError(message, code, status)
}

/**
 * Read `{ message, code }` out of an error body. Accepts both envelopes the
 * server uses: the legacy `{ error: 'msg', code }` and the HTTP-port
 * `{ error: 'msg', code, details: { code } }` (the finer `details.code` wins),
 * plus a defensive `{ error: { message, code } }`.
 */
export function parseErrorBody(
  body: unknown,
  status: number,
  statusText: string
): { message: string; code?: string } {
  const fallback = `HTTP ${status}: ${statusText}`
  if (!body || typeof body !== 'object') return { message: fallback }
  const b = body as Record<string, any>
  const detailsCode = typeof b.details?.code === 'string' ? b.details.code : undefined
  if (b.error && typeof b.error === 'object') {
    return {
      message: String(b.error.message || b.message || fallback),
      code: detailsCode || b.error.code || b.code,
    }
  }
  return {
    message: String(b.error || b.message || fallback),
    code: detailsCode || b.code,
  }
}
