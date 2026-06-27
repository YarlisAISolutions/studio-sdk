/**
 * Tests for the management (CRUD) methods added to MyBotBoxClient. The HTTP
 * layer (node-fetch) is mocked so these stay hermetic — they assert the right
 * method/URL/headers/body are sent and that errors map to MyBotBoxError.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))
vi.mock('node-fetch', () => ({ default: mockFetch }))

import { MyBotBoxClient, MyBotBoxError } from './index'

const BASE = 'https://api.example.com'
let client: MyBotBoxClient

/** Build a node-fetch-like Response stub. */
const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: () => null },
  text: async () => JSON.stringify(body),
  json: async () => body,
})
const fail = (status: number, body: unknown) => ({
  ok: false,
  status,
  statusText: 'Error',
  headers: { get: () => null },
  text: async () => JSON.stringify(body),
  json: async () => body,
})

beforeEach(() => {
  client = new MyBotBoxClient({ apiKey: 'sk-test', baseUrl: BASE })
})
afterEach(() => vi.clearAllMocks())

describe('MyBotBoxClient management CRUD', () => {
  it('createWorkflow POSTs with the API key + JSON body', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'wf-1', name: 'New' }))
    const result = await client.createWorkflow({ name: 'New', workspaceId: 'ws-1' })
    expect(result).toEqual({ id: 'wf-1', name: 'New' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/workflows`)
    expect(init.method).toBe('POST')
    expect(init.headers['X-API-Key']).toBe('sk-test')
    expect(JSON.parse(init.body)).toEqual({ name: 'New', workspaceId: 'ws-1' })
  })

  it('listWorkflows adds the workspaceId query param', async () => {
    mockFetch.mockResolvedValueOnce(ok({ data: [] }))
    await client.listWorkflows('ws-9')
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/api/workflows?workspaceId=ws-9`)
    expect(mockFetch.mock.calls[0][1].method).toBe('GET')
  })

  it('moveWorkflow PUTs the folderId', async () => {
    mockFetch.mockResolvedValueOnce(ok({ data: { id: 'wf-1', folderId: 'p-1' } }))
    await client.moveWorkflow('wf-1', 'p-1')
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/workflows/wf-1`)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ folderId: 'p-1' })
  })

  it('deleteWorkflow tolerates an empty response body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      text: async () => '',
    })
    const result = await client.deleteWorkflow('wf-1')
    expect(result).toEqual({})
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('listProjects requests /api/projects with includeArchived', async () => {
    mockFetch.mockResolvedValueOnce(ok({ projects: [] }))
    await client.listProjects('ws-1', true)
    const url = String(mockFetch.mock.calls[0][0])
    expect(url).toContain('/api/projects?')
    expect(url).toContain('workspaceId=ws-1')
    expect(url).toContain('includeArchived=true')
  })

  it('createFolder POSTs to /api/folders (a top-level folder is a Project)', async () => {
    mockFetch.mockResolvedValueOnce(ok({ folder: { id: 'p-1', name: 'Proj' } }))
    await client.createFolder({ name: 'Proj', workspaceId: 'ws-1', description: 'x' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/folders`)
    expect(JSON.parse(init.body)).toMatchObject({ name: 'Proj', workspaceId: 'ws-1' })
  })

  it('maps a non-OK response to MyBotBoxError carrying status + code', async () => {
    mockFetch.mockResolvedValueOnce(
      fail(403, { error: 'Admin access required', code: 'FORBIDDEN' })
    )
    await expect(client.deleteFolder('p-1')).rejects.toMatchObject({
      name: 'MyBotBoxError',
      status: 403,
      code: 'FORBIDDEN',
    })
  })

  it('rethrows MyBotBoxError instances unwrapped', async () => {
    mockFetch.mockResolvedValueOnce(fail(401, { error: 'Unauthorized' }))
    const err = await client.getWorkflow('wf-x').catch((e) => e)
    expect(err).toBeInstanceOf(MyBotBoxError)
    expect(err.status).toBe(401)
  })

  it('listWorkspaces GETs /api/workspaces', async () => {
    mockFetch.mockResolvedValueOnce(ok({ workspaces: [] }))
    await client.listWorkspaces()
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/api/workspaces`)
    expect(mockFetch.mock.calls[0][1].method).toBe('GET')
  })

  it('createWorkspace POSTs the name', async () => {
    mockFetch.mockResolvedValueOnce(ok({ workspace: { id: 'ws-1', name: 'Acme' } }))
    await client.createWorkspace('Acme')
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/workspaces`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ name: 'Acme' })
  })

  it('deleteWorkspace DELETEs with deleteTemplates flag', async () => {
    mockFetch.mockResolvedValueOnce(ok({ success: true }))
    await client.deleteWorkspace('ws-1')
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/workspaces/ws-1`)
    expect(init.method).toBe('DELETE')
    expect(JSON.parse(init.body)).toEqual({ deleteTemplates: false })
  })
})
