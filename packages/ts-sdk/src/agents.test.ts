/**
 * Tests for `client.agents` and the workflow run waiters (`getRunStatus`,
 * `waitForRun`). node-fetch is mocked, and time comes from a fake clock whose
 * `sleep` advances `now`, so the polling and deadline logic run instantly and
 * deterministically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))
vi.mock('node-fetch', () => ({ default: mockFetch }))

import { AuthExpiredError, MyBotBoxClient, MyBotBoxError } from './index'

const BASE = 'https://api.example.com'

const reply = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 202 ? 'Accepted' : 'OK',
  headers: { get: () => null },
  text: async () => JSON.stringify(body),
  json: async () => body,
})

function fakeClock() {
  let t = 1_000_000
  const sleeps: number[] = []
  return {
    now: () => t,
    sleep: async (ms: number) => {
      sleeps.push(ms)
      t += ms
    },
    sleeps,
  }
}

let client: MyBotBoxClient
let clock: ReturnType<typeof fakeClock>

beforeEach(() => {
  client = new MyBotBoxClient({ apiKey: 'sk-test', baseUrl: BASE })
  clock = fakeClock()
  client._clock = clock
})
afterEach(() => vi.resetAllMocks())

const call = (i: number) => {
  const [url, init] = mockFetch.mock.calls[i]
  return {
    url: url as string,
    method: init.method as string,
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body) : undefined,
  }
}

describe('client.agents.create', () => {
  it('POSTs name/instructions/model/workspaceId with the API key and Idempotency-Key', async () => {
    const agent = {
      id: 'wf-1',
      name: 'Echo',
      model: 'gpt-4o-mini',
      workspaceId: 'ws-1',
      deployed: true,
    }
    mockFetch.mockResolvedValueOnce(reply(201, agent))

    const result = await client.agents.create({
      name: 'Echo',
      instructions: 'Reply with PONG',
      model: 'gpt-4o-mini',
      workspaceId: 'ws-1',
      idempotencyKey: 'idem-1',
    })

    expect(result).toEqual(agent)
    const c = call(0)
    expect(c.url).toBe(`${BASE}/api/v1/agents`)
    expect(c.method).toBe('POST')
    expect(c.headers['X-API-Key']).toBe('sk-test')
    expect(c.headers['Idempotency-Key']).toBe('idem-1')
    expect(c.headers['Content-Type']).toBe('application/json')
    // The idempotency key travels as a header, never in the body.
    expect(c.body).toEqual({
      name: 'Echo',
      instructions: 'Reply with PONG',
      model: 'gpt-4o-mini',
      workspaceId: 'ws-1',
    })
  })

  it('sends no Idempotency-Key header when none is given', async () => {
    mockFetch.mockResolvedValueOnce(reply(201, { id: 'wf-1' }))
    await client.agents.create({ name: 'Echo', instructions: 'x' })
    expect(call(0).headers).not.toHaveProperty('Idempotency-Key')
  })

  it('maps an HTTP-port error envelope, preferring details.code', async () => {
    mockFetch.mockResolvedValueOnce(
      reply(400, {
        error: 'Pick a workspace',
        code: 'VALIDATION',
        details: { code: 'WORKSPACE_REQUIRED' },
      })
    )
    const err = await client.agents.create({ name: 'a', instructions: 'b' }).catch((e) => e)
    expect(err).toBeInstanceOf(MyBotBoxError)
    expect(err.status).toBe(400)
    expect(err.code).toBe('WORKSPACE_REQUIRED')
    expect(err.message).toBe('Pick a workspace')
  })

  it('maps 401 to AuthExpiredError and 403 to a MyBotBoxError with the server code', async () => {
    mockFetch.mockResolvedValueOnce(reply(401, { error: 'Unauthorized' }))
    await expect(client.agents.create({ name: 'a', instructions: 'b' })).rejects.toBeInstanceOf(
      AuthExpiredError
    )

    mockFetch.mockResolvedValueOnce(
      reply(403, { error: 'Missing scope', code: 'INSUFFICIENT_SCOPE' })
    )
    const err = await client.agents.create({ name: 'a', instructions: 'b' }).catch((e) => e)
    expect(err).not.toBeInstanceOf(AuthExpiredError)
    expect(err.status).toBe(403)
    expect(err.code).toBe('INSUFFICIENT_SCOPE')
  })
})

describe('client.agents.list / get', () => {
  it('list GETs with workspaceId, limit and cursor in the query string', async () => {
    mockFetch.mockResolvedValueOnce(reply(200, { data: [], nextCursor: null }))
    const page = await client.agents.list({ workspaceId: 'ws-1', limit: 10, cursor: 'c-2' })
    expect(page).toEqual({ data: [], nextCursor: null })
    const c = call(0)
    expect(c.method).toBe('GET')
    const url = new URL(c.url)
    expect(`${url.origin}${url.pathname}`).toBe(`${BASE}/api/v1/agents`)
    expect(url.searchParams.get('workspaceId')).toBe('ws-1')
    expect(url.searchParams.get('limit')).toBe('10')
    expect(url.searchParams.get('cursor')).toBe('c-2')
    expect(c.headers['X-API-Key']).toBe('sk-test')
    expect(c.body).toBeUndefined()
  })

  it('list with no options hits the bare collection URL', async () => {
    mockFetch.mockResolvedValueOnce(reply(200, { data: [] }))
    await client.agents.list()
    expect(call(0).url).toBe(`${BASE}/api/v1/agents`)
  })

  it('get GETs one agent by id', async () => {
    mockFetch.mockResolvedValueOnce(reply(200, { id: 'wf-9', name: 'A' }))
    const agent = await client.agents.get('wf-9')
    expect(agent.id).toBe('wf-9')
    expect(call(0).url).toBe(`${BASE}/api/v1/agents/wf-9`)
    expect(call(0).method).toBe('GET')
  })
})

describe('client.agents.run', () => {
  const done = {
    runId: 'run-1',
    status: 'completed',
    reply: 'PONG',
    output: { reply: 'PONG' },
    error: null,
  }

  it('POSTs { message, wait: true, timeoutMs } and returns the 200 reply without polling', async () => {
    mockFetch.mockResolvedValueOnce(reply(200, done))

    const run = await client.agents.run('wf-1', {
      message: 'ping',
      timeoutMs: 30_000,
      idempotencyKey: 'run-key',
    })

    expect(run.reply).toBe('PONG')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const c = call(0)
    expect(c.url).toBe(`${BASE}/api/v1/agents/wf-1/runs`)
    expect(c.method).toBe('POST')
    expect(c.headers['X-API-Key']).toBe('sk-test')
    expect(c.headers['Idempotency-Key']).toBe('run-key')
    expect(c.body).toEqual({ message: 'ping', wait: true, timeoutMs: 30_000 })
  })

  it('caps the server wait at 55s even when the caller allows longer (default 120s)', async () => {
    mockFetch.mockResolvedValueOnce(reply(200, done))
    await client.agents.run('wf-1', { message: 'ping' })
    expect(call(0).body.timeoutMs).toBe(55_000)
  })

  it('on 202 polls GET /runs/{runId} with backoff until the run is terminal', async () => {
    mockFetch
      .mockResolvedValueOnce(reply(202, { runId: 'run-1', status: 'running' }))
      .mockResolvedValueOnce(reply(200, { runId: 'run-1', status: 'running' }))
      .mockResolvedValueOnce(reply(200, { runId: 'run-1', status: 'running' }))
      .mockResolvedValueOnce(reply(200, done))

    const run = await client.agents.run('wf-1', { message: 'ping' })

    expect(run).toEqual(done)
    expect(mockFetch).toHaveBeenCalledTimes(4)
    for (const i of [1, 2, 3]) {
      expect(call(i).url).toBe(`${BASE}/api/v1/agents/wf-1/runs/run-1`)
      expect(call(i).method).toBe('GET')
      expect(call(i).headers['X-API-Key']).toBe('sk-test')
    }
    expect(clock.sleeps).toEqual([500, 1000, 2000])
  })

  it('returns a failed run instead of throwing', async () => {
    mockFetch
      .mockResolvedValueOnce(reply(202, { runId: 'run-1', status: 'queued' }))
      .mockResolvedValueOnce(
        reply(200, { runId: 'run-1', status: 'failed', reply: null, error: 'model error' })
      )
    const run = await client.agents.run('wf-1', { message: 'ping' })
    expect(run.status).toBe('failed')
    expect(run.error).toBe('model error')
  })

  it('throws TIMEOUT once timeoutMs (counted from the call start) passes', async () => {
    mockFetch.mockImplementation(async (url: string, init: any) =>
      init.method === 'POST'
        ? reply(202, { runId: 'run-1', status: 'running' })
        : reply(200, { runId: 'run-1', status: 'running' })
    )

    const err = await client.agents
      .run('wf-1', { message: 'ping', timeoutMs: 5_000 })
      .catch((e) => e)

    expect(err).toBeInstanceOf(MyBotBoxError)
    expect(err.code).toBe('TIMEOUT')
    // 500 + 1000 + 2000 + the 1500 left before the deadline = exactly 5000ms waited.
    expect(clock.sleeps).toEqual([500, 1000, 2000, 1500])
  })
})

describe('getRunStatus / waitForRun', () => {
  const running = { runId: 'exec_1', status: 'running', output: null, error: null }
  const completed = { runId: 'exec_1', status: 'completed', output: { ok: 1 }, error: null }

  it('getRunStatus GETs /api/workflows/{id}/runs/{runId}/status', async () => {
    mockFetch.mockResolvedValueOnce(reply(200, completed))
    const run = await client.getRunStatus('wf-1', 'exec_1')
    expect(run).toEqual(completed)
    expect(call(0).url).toBe(`${BASE}/api/workflows/wf-1/runs/exec_1/status`)
    expect(call(0).method).toBe('GET')
    expect(call(0).headers['X-API-Key']).toBe('sk-test')
  })

  it('waitForRun returns immediately when the run is already terminal', async () => {
    mockFetch.mockResolvedValueOnce(reply(200, completed))
    await expect(client.waitForRun('wf-1', 'exec_1')).resolves.toEqual(completed)
    expect(clock.sleeps).toEqual([])
  })

  it('waitForRun polls until terminal', async () => {
    mockFetch
      .mockResolvedValueOnce(reply(200, running))
      .mockResolvedValueOnce(reply(200, running))
      .mockResolvedValueOnce(reply(200, completed))
    await expect(client.waitForRun('wf-1', 'exec_1')).resolves.toEqual(completed)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(clock.sleeps).toEqual([500, 1000])
  })

  it('waitForRun treats paused as non-terminal and throws TIMEOUT at the deadline', async () => {
    mockFetch.mockResolvedValue(reply(200, { ...running, status: 'paused' }))
    const err = await client.waitForRun('wf-1', 'exec_1', { timeoutMs: 1_000 }).catch((e) => e)
    expect(err).toBeInstanceOf(MyBotBoxError)
    expect(err.code).toBe('TIMEOUT')
    expect(clock.sleeps).toEqual([500, 500])
  })

  it('waitForRun surfaces a 404 as a MyBotBoxError', async () => {
    mockFetch.mockResolvedValueOnce(reply(404, { error: 'Run not found or access denied' }))
    const err = await client.waitForRun('wf-1', 'nope').catch((e) => e)
    expect(err).toBeInstanceOf(MyBotBoxError)
    expect(err.status).toBe(404)
  })
})
