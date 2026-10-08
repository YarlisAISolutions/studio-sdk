/**
 * `client.agents` — create, list, get and run AI agents over the public
 * `/api/v1/agents` API.
 *
 * An agent is a deployed Start → Agent → Response workflow; the agent id is the
 * workflow id, so an agent also opens in the canvas (`canvasUrl`).
 */

import { MyBotBoxError } from './errors.js'
import { type Clock, isTerminalRunStatus, pollUntilTerminal, type RunStatus } from './runs.js'

export interface Agent {
  id: string
  name: string
  model: string
  workspaceId: string
  deployed: boolean
  createdAt: string
  /** Link that opens the agent's workflow in the editor. */
  canvasUrl?: string
  [key: string]: unknown
}

export interface AgentRun {
  runId: string
  status: RunStatus
  /** The agent's reply text once the run completed. */
  reply?: string | null
  /** The full Response block output. */
  output?: unknown
  error?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  [key: string]: unknown
}

export interface CreateAgentInput {
  name: string
  /** System instructions for the agent. */
  instructions: string
  /** Hosted model id. The server defaults to `gpt-4o-mini`. */
  model?: string
  /** Required when the key's user has more than one writable workspace. */
  workspaceId?: string
  /** Makes a retried create return the same agent instead of a duplicate. */
  idempotencyKey?: string
}

export interface ListAgentsOptions {
  workspaceId?: string
  /** Page size, at most 50. */
  limit?: number
  /** `nextCursor` from the previous page. */
  cursor?: string
}

export interface AgentList {
  data: Agent[]
  nextCursor?: string | null
}

export interface RunAgentOptions {
  message: string
  /**
   * Total time to wait for the reply, including polling after the server's own
   * wait window (the server holds a request for at most 55s). Default 120000.
   */
  timeoutMs?: number
  /** Makes a retried run return the same run instead of starting another. */
  idempotencyKey?: string
}

/** The longest wait the server honours on one request (it clamps to 1–55s). */
export const SERVER_MAX_WAIT_MS = 55_000
export const DEFAULT_AGENT_RUN_TIMEOUT_MS = 120_000

export interface RawRequestOptions {
  body?: unknown
  headers?: Record<string, string>
}

/** Status + parsed body of a successful (2xx) response; non-2xx throws. */
export type RawRequest = <T>(
  method: 'GET' | 'POST',
  path: string,
  options?: RawRequestOptions
) => Promise<{ status: number; body: T }>

function idempotencyHeaders(key?: string): Record<string, string> | undefined {
  return key ? { 'Idempotency-Key': key } : undefined
}

export class AgentsNamespace {
  constructor(
    private readonly request: RawRequest,
    private readonly clock: () => Clock
  ) {}

  /** Create and deploy an agent. */
  async create(input: CreateAgentInput): Promise<Agent> {
    const { idempotencyKey, ...body } = input
    const res = await this.request<Agent>('POST', '/api/v1/agents', {
      body,
      headers: idempotencyHeaders(idempotencyKey),
    })
    return res.body
  }

  /** List agents, newest first. Page with `cursor: page.nextCursor`. */
  async list(options: ListAgentsOptions = {}): Promise<AgentList> {
    const qs = new URLSearchParams()
    if (options.workspaceId) qs.set('workspaceId', options.workspaceId)
    if (options.limit !== undefined) qs.set('limit', String(options.limit))
    if (options.cursor) qs.set('cursor', options.cursor)
    const query = qs.toString()
    const res = await this.request<AgentList>('GET', `/api/v1/agents${query ? `?${query}` : ''}`)
    return res.body
  }

  /** Get one agent. */
  async get(agentId: string): Promise<Agent> {
    const res = await this.request<Agent>('GET', `/api/v1/agents/${encodeURIComponent(agentId)}`)
    return res.body
  }

  /** Read a run's current state without waiting. */
  async getRun(agentId: string, runId: string): Promise<AgentRun> {
    const res = await this.request<AgentRun>(
      'GET',
      `/api/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`
    )
    return res.body
  }

  /**
   * Send `message` to the agent and wait for its reply.
   *
   * The server waits up to 55s. If the run is still going (HTTP 202), this
   * polls the run until it finishes or `timeoutMs` (measured from the start of
   * this call) runs out, then throws a `MyBotBoxError` with code `TIMEOUT`.
   * A run that finished as `failed` or `cancelled` is returned, not thrown —
   * check `run.status` and `run.error`.
   */
  async run(agentId: string, options: RunAgentOptions): Promise<AgentRun> {
    const { message, idempotencyKey } = options
    const timeoutMs = options.timeoutMs ?? DEFAULT_AGENT_RUN_TIMEOUT_MS
    const clock = this.clock()
    const deadline = clock.now() + timeoutMs

    const res = await this.request<AgentRun>(
      'POST',
      `/api/v1/agents/${encodeURIComponent(agentId)}/runs`,
      {
        body: {
          message,
          wait: true,
          timeoutMs: Math.max(1, Math.min(timeoutMs, SERVER_MAX_WAIT_MS)),
        },
        headers: idempotencyHeaders(idempotencyKey),
      }
    )
    const first = res.body
    if (isTerminalRunStatus(first.status)) return first

    const done = await pollUntilTerminal(() => this.getRun(agentId, first.runId), deadline, clock)
    if (done) return done
    throw new MyBotBoxError(
      `Agent run ${first.runId} did not finish within ${timeoutMs}ms`,
      'TIMEOUT'
    )
  }
}
