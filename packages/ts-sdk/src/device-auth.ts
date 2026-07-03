/**
 * Device-flow login for the SDK — the gh-style browser auth used by the CLI,
 * exposed so SDK users can authenticate themselves instead of hand-pasting a key.
 *
 * Node-only (needs the filesystem + a browser opener). All node built-ins are
 * loaded via dynamic import so importing the SDK stays browser-safe; calling
 * these functions in a browser throws a clear error.
 *
 * Credentials are stored in `~/.mybotbox/hosts.json` — the SAME file the
 * `mybotbox` CLI uses — so the CLI and SDK share one login.
 */

const CLIENT_ID = 'mybotbox-sdk'
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
const DEFAULT_HOST = 'https://app.mybotbox.com'

export interface DeviceLoginOptions {
  /** MyBotBox host (default: env MYBOTBOX_HOST or app.mybotbox.com). */
  host?: string
  /** Space-delimited scopes to request (default: the standard set). */
  scope?: string
  /** Print progress to the console (default true). */
  log?: boolean
}

interface HostEntry {
  token: string
  user?: { id?: string; email?: string; name?: string }
}

function isNode(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node
}

/** Resolve the active host: explicit → env → default (protocol-normalized). */
export function resolveHost(flag?: string): string {
  const raw = flag || (isNode() ? process.env.MYBOTBOX_HOST : undefined) || DEFAULT_HOST
  return raw.startsWith('http') ? raw.replace(/\/+$/, '') : `https://${raw.replace(/\/+$/, '')}`
}

function normalizeHostKey(host: string): string {
  return host
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

async function configPaths() {
  const os = await import('node:os')
  const path = await import('node:path')
  const dir = process.env.MYBOTBOX_CONFIG_DIR || path.join(os.homedir(), '.mybotbox')
  return { dir, file: path.join(dir, 'hosts.json') }
}

async function readHosts(): Promise<Record<string, HostEntry>> {
  const fs = await import('node:fs')
  const { file } = await configPaths()
  if (!fs.existsSync(file)) return {}
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, HostEntry>
  } catch {
    return {}
  }
}

async function writeHosts(data: Record<string, HostEntry>): Promise<void> {
  const fs = await import('node:fs')
  const { dir, file } = await configPaths()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 })
  try {
    fs.chmodSync(dir, 0o700)
    fs.chmodSync(file, 0o600)
  } catch {
    // best-effort on platforms without POSIX perms
  }
}

/**
 * Load a stored token for a host: env `MYBOTBOX_TOKEN` wins, else the file entry
 * (shared with the CLI). Returns undefined if none.
 */
export async function loadStoredToken(host?: string): Promise<string | undefined> {
  if (typeof process !== 'undefined' && process.env?.MYBOTBOX_TOKEN) {
    return process.env.MYBOTBOX_TOKEN
  }
  if (!isNode()) return undefined
  const hosts = await readHosts()
  return hosts[normalizeHostKey(resolveHost(host))]?.token
}

async function saveToken(host: string, token: string, user?: HostEntry['user']): Promise<void> {
  const hosts = await readHosts()
  hosts[normalizeHostKey(host)] = { token, user }
  await writeHosts(hosts)
}

async function openBrowser(url: string): Promise<void> {
  try {
    const { spawn } = await import('node:child_process')
    const cmd =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    const child = spawn(cmd, [url], {
      stdio: 'ignore',
      detached: true,
      shell: process.platform === 'win32',
    })
    child.on('error', () => {})
    child.unref()
  } catch {
    // Non-fatal — the user can open the URL manually.
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface DeviceInit {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  interval: number
  expires_in: number
  scope?: string
}

async function pollForToken(host: string, init: DeviceInit): Promise<string> {
  const deadline = Date.now() + init.expires_in * 1000
  let interval = Math.max(init.interval, 1) * 1000
  while (Date.now() < deadline) {
    await sleep(interval)
    const res = await fetch(`${host}/api/auth/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: DEVICE_GRANT,
        device_code: init.device_code,
        client_id: CLIENT_ID,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, string>
    if (res.ok && data.access_token) return data.access_token
    switch (data.error) {
      case 'authorization_pending':
        break
      case 'slow_down':
        interval += 5000
        break
      case 'access_denied':
        throw new Error('Authorization was denied in the browser.')
      case 'expired_token':
        throw new Error('The code expired before you approved. Run device login again.')
      default:
        if (!res.ok) throw new Error(data.error_description || data.error || `HTTP ${res.status}`)
    }
  }
  throw new Error('Timed out waiting for authorization.')
}

/**
 * Run the browser device-login flow and persist the token (shared with the CLI).
 * Returns `{ token, host }`. Node-only; interactive (opens a browser). For
 * headless/CI, set `MYBOTBOX_TOKEN` instead.
 */
export async function deviceLogin(
  options: DeviceLoginOptions = {}
): Promise<{ token: string; host: string }> {
  if (!isNode()) {
    throw new Error(
      'deviceLogin() is only available in Node. In other environments pass an apiKey or set MYBOTBOX_TOKEN.'
    )
  }
  const host = resolveHost(options.host)
  const log = options.log !== false
  const os = await import('node:os')

  const initRes = await fetch(`${host}/api/auth/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: options.scope,
      device_name: os.hostname(),
    }),
  })
  if (!initRes.ok) {
    const err = (await initRes.json().catch(() => ({}))) as Record<string, string>
    throw new Error(err.error_description || `Failed to start login (HTTP ${initRes.status})`)
  }
  const init = (await initRes.json()) as DeviceInit

  if (log) {
    console.log(`\n  First copy your one-time code: ${init.user_code}`)
    console.log(`  Opening ${init.verification_uri} in your browser…`)
    if (init.scope) console.log(`  Requested scopes: ${init.scope}`)
    console.log('  (If the browser does not open, visit the URL above and enter the code.)\n')
  }
  await openBrowser(init.verification_uri_complete || init.verification_uri)

  const token = await pollForToken(host, init)
  await saveToken(host, token)
  if (log) console.log(`✓ Logged in to ${host}`)
  return { token, host }
}
