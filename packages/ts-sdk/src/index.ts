// Copilot model lineup (generated from @yarlisai/ai — see copilot-models.ts)
export * from './copilot-models.js'
// Browser device-login (gh-style) — authenticate the SDK without a hand-pasted key.
export {
  type DeviceLoginOptions,
  deviceLogin,
  loadStoredToken,
  resolveHost,
} from './device-auth.js'

import fetch from 'node-fetch'
import { AgentsNamespace, type RawRequestOptions } from './agents.js'
import {
  AuthExpiredError,
  httpError,
  isAuthExpired,
  MyBotBoxError,
  parseErrorBody,
} from './errors.js'
import {
  type Clock,
  isTerminalRunStatus,
  pollUntilTerminal,
  type RunStatus,
  systemClock,
} from './runs.js'

export {
  type Agent,
  type AgentList,
  type AgentRun,
  AgentsNamespace,
  type CreateAgentInput,
  type ListAgentsOptions,
  type RunAgentOptions,
} from './agents.js'
export { isTerminalRunStatus, type RunStatus, TERMINAL_RUN_STATUSES } from './runs.js'
export { AuthExpiredError, isAuthExpired, MyBotBoxError }

export interface MyBotBoxConfig {
  /**
   * API key. Optional: when omitted the SDK auto-loads a token from
   * `MYBOTBOX_TOKEN` (any env) or, in Node, a device-login token stored by
   * `deviceLogin()` / the `mybotbox` CLI. Use {@link MyBotBoxClient.login} to
   * authenticate through the browser.
   */
  apiKey?: string
  baseUrl?: string
}

/**
 * What `POST /api/workflows/{id}/execute` returns: the run is queued and runs
 * in the background. Follow it with {@link MyBotBoxClient.getRunStatus} or
 * {@link MyBotBoxClient.waitForRun}.
 */
export interface QueuedExecutionResult {
  success: boolean
  /** The run id — pass it to `getRunStatus` / `waitForRun`. */
  executionId: string
  status: 'queued'
  taskName?: string
}

/** A workflow run, as `GET /api/workflows/{id}/runs/{runId}/status` returns it. */
export interface WorkflowRun {
  runId: string
  status: RunStatus
  output: unknown
  error: string | null
  triggerType: string | null
  startedAt: string | null
  finishedAt: string | null
}

export interface WaitForRunOptions {
  /** Give up after this long and throw a `TIMEOUT` error. Default 120000. */
  timeoutMs?: number
}

/**
 * Result shape of {@link MyBotBoxClient.executeWorkflowSync}. The execute
 * endpoint itself never returns this — it queues (see {@link QueuedExecutionResult}).
 */
export interface WorkflowExecutionResult {
  success: boolean
  output?: any
  error?: string
  logs?: any[]
  metadata?: {
    duration?: number
    executionId?: string
    [key: string]: any
  }
  traceSpans?: any[]
  totalDuration?: number
}

export interface WorkflowStatus {
  isDeployed: boolean
  deployedAt?: string
  isPublished: boolean
  needsRedeployment: boolean
}

export interface ExecutionOptions {
  /** The workflow's input, sent as `{ input }`. File objects become base64. */
  input?: any
  /** Request timeout in ms (for `executeWorkflowSync`, the wait for the run). */
  timeout?: number
  stream?: boolean
  selectedOutputs?: string[]
  /** Sends `X-Execution-Mode: async`. Every execute is queued today, so it has no effect. */
  async?: boolean
}

/**
 * @deprecated The server never returned this shape (`taskId`/`links`); execute
 * returns {@link QueuedExecutionResult}. Kept so existing imports compile.
 */
export interface AsyncExecutionResult {
  success: boolean
  taskId: string
  status: 'queued'
  createdAt: string
  links: {
    status: string
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
}

export interface UsageLimits {
  success: boolean
  rateLimit: {
    sync: {
      isLimited: boolean
      limit: number
      remaining: number
      resetAt: string
    }
    async: {
      isLimited: boolean
      limit: number
      remaining: number
      resetAt: string
    }
    authType: string
  }
  usage: {
    currentPeriodCost: number
    limit: number
    plan: string
  }
}

// ───────────────────────── Management resource types ─────────────────────────

export interface WorkflowRecord {
  id: string
  name: string
  description?: string
  color?: string
  workspaceId?: string | null
  folderId?: string | null
  isDeployed?: boolean
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  color?: string
  workspaceId?: string
  folderId?: string | null
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  color?: string
  folderId?: string | null
  [key: string]: unknown
}

export interface FolderRecord {
  id: string
  name: string
  workspaceId: string
  parentId: string | null
  color?: string | null
  description?: string | null
  icon?: string | null
  archivedAt?: string | null
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface ProjectRecord extends FolderRecord {
  workflowCount: number
  subfolderCount: number
}

export interface CreateFolderInput {
  name: string
  workspaceId: string
  parentId?: string | null
  color?: string
  description?: string | null
  icon?: string | null
}

export interface UpdateFolderInput {
  name?: string
  color?: string
  isExpanded?: boolean
  parentId?: string | null
  description?: string | null
  icon?: string | null
  /** ISO timestamp to archive, or null to restore. */
  archivedAt?: string | null
}

export interface WorkspaceRecord {
  id: string
  name: string
  ownerId?: string
  createdAt?: string
  updatedAt?: string
  /** Present on list responses. */
  role?: 'owner' | 'member'
  permissions?: string
  [key: string]: unknown
}

export interface UpdateWorkspaceInput {
  name?: string
  [key: string]: unknown
}

/**
 * Remove trailing slashes from a URL
 * Uses string operations instead of regex to prevent ReDoS attacks
 * @param url - The URL to normalize
 * @returns URL without trailing slashes
 */
function normalizeBaseUrl(url: string): string {
  let normalized = url
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

export class MyBotBoxClient {
  private apiKey: string
  private baseUrl: string
  private rateLimitInfo: RateLimitInfo | null = null

  /** @internal Time source for the run waiters; tests swap it for a fake clock. */
  _clock: Clock = systemClock

  /** Create, list, get and run AI agents (`/api/v1/agents`). */
  readonly agents: AgentsNamespace = new AgentsNamespace(
    (method, path, options) => this.requestRaw(method, path, options),
    () => this._clock
  )

  constructor(config: MyBotBoxConfig = {}) {
    // Explicit key wins; otherwise auto-load MYBOTBOX_TOKEN (isomorphic). A
    // Node-stored device token is loaded via the async static helpers below.
    const envToken = typeof process !== 'undefined' ? process.env?.MYBOTBOX_TOKEN : undefined
    this.apiKey = config.apiKey || envToken || ''
    this.baseUrl = normalizeBaseUrl(config.baseUrl || 'https://mybotbox.com')
  }

  /**
   * Authenticate through the browser (device flow) and return a ready client.
   * Node-only, interactive. Reuses/stores the credential shared with the CLI.
   */
  static async login(options: { host?: string; scope?: string } = {}): Promise<MyBotBoxClient> {
    const { deviceLogin } = await import('./device-auth.js')
    const { token, host } = await deviceLogin(options)
    return new MyBotBoxClient({ apiKey: token, baseUrl: host })
  }

  /**
   * Build a client from a previously-stored device-login token (Node-only).
   * Throws {@link AuthExpiredError} when no credential is found — prompting a
   * `MyBotBoxClient.login()`.
   */
  static async fromStoredCredentials(options: { host?: string } = {}): Promise<MyBotBoxClient> {
    const { loadStoredToken, resolveHost } = await import('./device-auth.js')
    const token = await loadStoredToken(options.host)
    if (!token) {
      throw new AuthExpiredError(
        'No stored credentials. Run MyBotBoxClient.login() or set MYBOTBOX_TOKEN.'
      )
    }
    return new MyBotBoxClient({ apiKey: token, baseUrl: resolveHost(options.host) })
  }

  /**
   * Convert File objects in input to API format (base64)
   * Recursively processes nested objects and arrays
   */
  private async convertFilesToBase64(
    value: any,
    visited: WeakSet<object> = new WeakSet()
  ): Promise<any> {
    // Check if File API is available (browser environment) and value is a File
    if (typeof File !== 'undefined' && value instanceof File) {
      const arrayBuffer = await value.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')

      return {
        type: 'file',
        data: `data:${value.type || 'application/octet-stream'};base64,${base64}`,
        name: value.name,
        mime: value.type || 'application/octet-stream',
      }
    }

    if (Array.isArray(value)) {
      if (visited.has(value)) {
        return '[Circular]'
      }
      visited.add(value)
      const result = await Promise.all(
        value.map((item) => this.convertFilesToBase64(item, visited))
      )
      visited.delete(value)
      return result
    }

    if (value !== null && typeof value === 'object') {
      if (visited.has(value)) {
        return '[Circular]'
      }
      visited.add(value)
      const converted: any = {}
      for (const [key, val] of Object.entries(value)) {
        converted[key] = await this.convertFilesToBase64(val, visited)
      }
      visited.delete(value)
      return converted
    }

    return value
  }

  /**
   * Queue a workflow run. Resolves as soon as the run is queued with its
   * `executionId`; use {@link waitForRun} for the result, or
   * {@link executeWorkflowSync} to do both.
   */
  async executeWorkflow(
    workflowId: string,
    options: ExecutionOptions = {}
  ): Promise<QueuedExecutionResult> {
    const url = `${this.baseUrl}/api/workflows/${workflowId}/execute`
    const { input, timeout = 30000, stream, selectedOutputs, async } = options

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), timeout)
      })

      // Build headers - async execution uses X-Execution-Mode header
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      }
      if (async) {
        headers['X-Execution-Mode'] = 'async'
      }

      // The server reads the workflow input from `body.input`; API control
      // parameters ride at the root. File objects are converted to base64.
      const jsonBody: any = {}
      if (input !== undefined) {
        jsonBody.input = await this.convertFilesToBase64(input)
      }

      if (stream !== undefined) {
        jsonBody.stream = stream
      }
      if (selectedOutputs !== undefined) {
        jsonBody.selectedOutputs = selectedOutputs
      }

      const fetchPromise = fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(jsonBody),
      })

      const response = await Promise.race([fetchPromise, timeoutPromise])

      // Extract rate limit headers
      this.updateRateLimitInfo(response)

      // Handle rate limiting with retry
      if (response.status === 429) {
        const retryAfter = this.rateLimitInfo?.retryAfter || 1000
        throw new MyBotBoxError(
          `Rate limit exceeded. Retry after ${retryAfter}ms`,
          'RATE_LIMIT_EXCEEDED',
          429
        )
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const { message, code } = parseErrorBody(errorData, response.status, response.statusText)
        throw httpError(response.status, message, code)
      }

      const result = await response.json()
      return result as QueuedExecutionResult
    } catch (error: any) {
      if (error instanceof MyBotBoxError) {
        throw error
      }

      if (error.message === 'TIMEOUT') {
        throw new MyBotBoxError(`Workflow execution timed out after ${timeout}ms`, 'TIMEOUT')
      }

      throw new MyBotBoxError(error?.message || 'Failed to execute workflow', 'EXECUTION_ERROR')
    }
  }

  /**
   * Get the status of a workflow (deployment status, etc.)
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const url = `${this.baseUrl}/api/workflows/${workflowId}/status`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as unknown as any
        throw new MyBotBoxError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          response.status
        )
      }

      const result = await response.json()
      return result as WorkflowStatus
    } catch (error: any) {
      if (error instanceof MyBotBoxError) {
        throw error
      }

      throw new MyBotBoxError(error?.message || 'Failed to get workflow status', 'STATUS_ERROR')
    }
  }

  /**
   * Read the current state of one workflow run (`executionId` from
   * {@link executeWorkflow}). Only the run's owner can read it.
   */
  async getRunStatus(workflowId: string, runId: string): Promise<WorkflowRun> {
    const res = await this.requestRaw<WorkflowRun>(
      'GET',
      `/api/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/status`
    )
    return res.body
  }

  /**
   * Poll a run until it is `completed`, `failed` or `cancelled` (backoff
   * 500ms → 2s). Returns the terminal run — a failed run is returned, not
   * thrown. Throws a `MyBotBoxError` with code `TIMEOUT` once `timeoutMs`
   * (default 120000) passes.
   */
  async waitForRun(
    workflowId: string,
    runId: string,
    options: WaitForRunOptions = {}
  ): Promise<WorkflowRun> {
    const timeoutMs = options.timeoutMs ?? 120_000
    const clock = this._clock
    const deadline = clock.now() + timeoutMs
    const first = await this.getRunStatus(workflowId, runId)
    if (isTerminalRunStatus(first.status)) return first
    const done = await pollUntilTerminal(
      () => this.getRunStatus(workflowId, runId),
      deadline,
      clock
    )
    if (done) return done
    throw new MyBotBoxError(`Run ${runId} did not finish within ${timeoutMs}ms`, 'TIMEOUT')
  }

  /**
   * Execute a workflow and poll for completion (useful for long-running workflows)
   */
  async executeWorkflowSync(
    workflowId: string,
    options: ExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    // Ensure sync mode by explicitly setting async to false
    const syncOptions = { ...options, async: false }
    return this.executeWorkflow(workflowId, syncOptions) as Promise<WorkflowExecutionResult>
  }

  /**
   * Validate that a workflow is ready for execution
   */
  async validateWorkflow(workflowId: string): Promise<boolean> {
    try {
      const status = await this.getWorkflowStatus(workflowId)
      return status.isDeployed
    } catch (error) {
      return false
    }
  }

  /**
   * Set a new API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Set a new base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = normalizeBaseUrl(baseUrl)
  }

  /**
   * Get the status of an async job
   * @param workflowId The workflow ID whose status to fetch
   */
  async getJobStatus(workflowId: string): Promise<any> {
    const url = `${this.baseUrl}/api/workflows/${workflowId}/status`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      })

      this.updateRateLimitInfo(response)

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as unknown as any
        throw new MyBotBoxError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          response.status
        )
      }

      const result = await response.json()
      return result
    } catch (error: any) {
      if (error instanceof MyBotBoxError) {
        throw error
      }

      throw new MyBotBoxError(error?.message || 'Failed to get job status', 'STATUS_ERROR')
    }
  }

  /**
   * Execute workflow with automatic retry on rate limit
   */
  async executeWithRetry(
    workflowId: string,
    options: ExecutionOptions = {},
    retryOptions: RetryOptions = {}
  ): Promise<QueuedExecutionResult> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
    } = retryOptions

    let lastError: MyBotBoxError | null = null
    let delay = initialDelay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeWorkflow(workflowId, options)
      } catch (error: any) {
        if (!(error instanceof MyBotBoxError) || error.code !== 'RATE_LIMIT_EXCEEDED') {
          throw error
        }

        lastError = error

        // Don't retry after last attempt
        if (attempt === maxRetries) {
          break
        }

        // Use retry-after if provided, otherwise use exponential backoff
        const waitTime =
          error.status === 429 && this.rateLimitInfo?.retryAfter
            ? this.rateLimitInfo.retryAfter
            : Math.min(delay, maxDelay)

        // Add jitter (±25%)
        const jitter = waitTime * (0.75 + Math.random() * 0.5)

        await new Promise((resolve) => setTimeout(resolve, jitter))

        // Exponential backoff for next attempt
        delay *= backoffMultiplier
      }
    }

    throw lastError || new MyBotBoxError('Max retries exceeded', 'MAX_RETRIES_EXCEEDED')
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo
  }

  /**
   * Update rate limit info from response headers
   * @private
   */
  private updateRateLimitInfo(response: any): void {
    const limit = response.headers.get('x-ratelimit-limit')
    const remaining = response.headers.get('x-ratelimit-remaining')
    const reset = response.headers.get('x-ratelimit-reset')
    const retryAfter = response.headers.get('retry-after')

    if (limit || remaining || reset) {
      this.rateLimitInfo = {
        limit: limit ? Number.parseInt(limit, 10) : 0,
        remaining: remaining ? Number.parseInt(remaining, 10) : 0,
        reset: reset ? Number.parseInt(reset, 10) : 0,
        retryAfter: retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : undefined,
      }
    }
  }

  /**
   * Get current usage limits and quota information
   */
  async getUsageLimits(): Promise<UsageLimits> {
    const url = `${this.baseUrl}/api/users/me/usage-limits`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      })

      this.updateRateLimitInfo(response)

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as unknown as any
        throw new MyBotBoxError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          response.status
        )
      }

      const result = await response.json()
      return result as UsageLimits
    } catch (error: any) {
      if (error instanceof MyBotBoxError) {
        throw error
      }

      throw new MyBotBoxError(error?.message || 'Failed to get usage limits', 'USAGE_ERROR')
    }
  }

  // ───────────────────────── Management (CRUD) ─────────────────────────
  // These call the hybrid-authed management routes (session OR X-API-Key).

  /**
   * Shared JSON request helper for the management endpoints — applies the API
   * key, parses errors into MyBotBoxError, and returns the typed body.
   */
  private async apiRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await this.requestRaw<T>(method, path, { body })
    return res.body
  }

  /**
   * @internal Like `apiRequest`, but also returns the HTTP status (so callers
   * can tell 200 from 202) and accepts extra headers (e.g. `Idempotency-Key`).
   * Non-2xx responses throw a {@link MyBotBoxError}.
   */
  async requestRaw<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: RawRequestOptions = {}
  ): Promise<{ status: number; body: T }> {
    const { body, headers: extraHeaders } = options
    const headers: Record<string, string> = { ...extraHeaders, 'X-API-Key': this.apiKey }
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      this.updateRateLimitInfo(response)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const { message, code } = parseErrorBody(errorData, response.status, response.statusText)
        throw httpError(response.status, message, code)
      }
      // DELETE may return an empty body.
      const text = await response.text()
      return { status: response.status, body: (text ? JSON.parse(text) : {}) as T }
    } catch (error: any) {
      if (error instanceof MyBotBoxError) throw error
      throw new MyBotBoxError(
        error?.message || `Request failed: ${method} ${path}`,
        'REQUEST_ERROR'
      )
    }
  }

  // Workflows
  /** List workflows (optionally scoped to a workspace). */
  listWorkflows(workspaceId?: string): Promise<{ data: WorkflowRecord[] }> {
    const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''
    return this.apiRequest('GET', `/api/workflows${qs}`)
  }
  /** Get a single workflow (metadata + editor state). */
  getWorkflow(workflowId: string): Promise<{ data: WorkflowRecord }> {
    return this.apiRequest('GET', `/api/workflows/${workflowId}`)
  }
  /** Create a workflow. */
  createWorkflow(data: CreateWorkflowInput): Promise<WorkflowRecord> {
    return this.apiRequest('POST', '/api/workflows', data)
  }
  /** Update a workflow's metadata. */
  updateWorkflow(
    workflowId: string,
    updates: UpdateWorkflowInput
  ): Promise<{ data: WorkflowRecord }> {
    return this.apiRequest('PUT', `/api/workflows/${workflowId}`, updates)
  }
  /** Soft-delete a workflow (recoverable via {@link restoreWorkflow}). */
  deleteWorkflow(workflowId: string): Promise<{ success: boolean }> {
    return this.apiRequest('DELETE', `/api/workflows/${workflowId}`)
  }
  /** Duplicate a workflow. */
  duplicateWorkflow(workflowId: string): Promise<WorkflowRecord> {
    return this.apiRequest('POST', `/api/workflows/${workflowId}/duplicate`)
  }
  /** Deploy a workflow to its runtime endpoint. */
  deployWorkflow(workflowId: string): Promise<unknown> {
    return this.apiRequest('POST', `/api/workflows/${workflowId}/deploy`)
  }
  /** Restore a soft-deleted workflow. */
  restoreWorkflow(workflowId: string): Promise<unknown> {
    return this.apiRequest('POST', `/api/workflows/${workflowId}/restore`)
  }
  /** Move a workflow into a folder/project (or to the root with null). */
  moveWorkflow(workflowId: string, folderId: string | null): Promise<{ data: WorkflowRecord }> {
    return this.apiRequest('PUT', `/api/workflows/${workflowId}`, { folderId })
  }

  // Projects & folders (a Project is a top-level folder)
  /** List a workspace's projects (top-level folders) with workflow counts. */
  listProjects(
    workspaceId: string,
    includeArchived = false
  ): Promise<{ projects: ProjectRecord[] }> {
    const qs = new URLSearchParams({ workspaceId })
    if (includeArchived) qs.set('includeArchived', 'true')
    return this.apiRequest('GET', `/api/projects?${qs}`)
  }
  /** List all folders in a workspace. */
  listFolders(workspaceId: string): Promise<{ folders: FolderRecord[] }> {
    return this.apiRequest('GET', `/api/folders?workspaceId=${encodeURIComponent(workspaceId)}`)
  }
  /** Create a folder; omit `parentId` to create a top-level Project. */
  createFolder(data: CreateFolderInput): Promise<{ folder: FolderRecord }> {
    return this.apiRequest('POST', '/api/folders', data)
  }
  /** Update a folder/project (name, color, description, icon, archivedAt, …). */
  updateFolder(folderId: string, updates: UpdateFolderInput): Promise<{ folder: FolderRecord }> {
    return this.apiRequest('PUT', `/api/folders/${folderId}`, updates)
  }
  /** Delete a folder and its contained (active) workflows. */
  deleteFolder(folderId: string): Promise<{ success: boolean }> {
    return this.apiRequest('DELETE', `/api/folders/${folderId}`)
  }

  // Workspaces
  /** List the workspaces the caller can access. */
  listWorkspaces(): Promise<{ workspaces: WorkspaceRecord[] }> {
    return this.apiRequest('GET', '/api/workspaces')
  }
  /** Get a single workspace. */
  getWorkspace(workspaceId: string): Promise<WorkspaceRecord> {
    return this.apiRequest('GET', `/api/workspaces/${workspaceId}`)
  }
  /** Create a workspace. */
  createWorkspace(name: string): Promise<{ workspace: WorkspaceRecord }> {
    return this.apiRequest('POST', '/api/workspaces', { name })
  }
  /** Update a workspace (e.g. rename). */
  updateWorkspace(workspaceId: string, updates: UpdateWorkspaceInput): Promise<unknown> {
    return this.apiRequest('PATCH', `/api/workspaces/${workspaceId}`, updates)
  }
  /** Delete a workspace. `deleteTemplates` defaults to false (templates kept). */
  deleteWorkspace(workspaceId: string, deleteTemplates = false): Promise<unknown> {
    return this.apiRequest('DELETE', `/api/workspaces/${workspaceId}`, { deleteTemplates })
  }
}

// Export types and classes with new branding
export default MyBotBoxClient

// Compatibility aliases
export const YStudioClient = MyBotBoxClient
export const YStudioError = MyBotBoxError
export type YStudioConfig = MyBotBoxConfig
export const YarlisClient = MyBotBoxClient
export const YarlisError = MyBotBoxError
export type YarlisConfig = MyBotBoxConfig
