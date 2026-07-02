/**
 * Drift gate for the vendored Copilot model lineups (issue #539).
 *
 * The SDKs vendor GENERATED copies of the lineup (see
 * scripts/sync-sdk-copilot-models.mjs) instead of depending on @yarlisai/ai
 * (which would drag openai/groq-sdk into every external install). This test
 * fails when the source lineup changes without regenerating the copies.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIVE_COPILOT_MODELS, COPILOT_MODELS, DEFAULT_COPILOT_MODEL } from './copilot-models'

const repoRoot = join(__dirname, '..', '..', '..')
const sourcePath = join(repoRoot, 'packages/ai/src/copilot/models.ts')
const pyPath = join(repoRoot, 'packages/python-sdk/ystudio/copilot_models.py')

/** Model ids declared in the source-of-truth file, in declaration order. */
function sourceModelIds(): string[] {
  const src = readFileSync(sourcePath, 'utf8')
  // Every lineup entry is written as `value: '<id>',` inside the four
  // *_COPILOT_MODELS arrays; type unions/aliases never use that exact shape.
  return [...src.matchAll(/^\s{4}value: '([^']+)',$/gm)].map((m) => m[1])
}

describe('vendored copilot model lineup stays in sync with @yarlisai/ai', () => {
  it('ts-sdk lineup matches the source ids exactly (order included)', () => {
    const expected = sourceModelIds()
    expect(expected.length).toBeGreaterThan(0)
    expect(COPILOT_MODELS.map((m) => m.value)).toEqual(expected)
  })

  it('python-sdk lineup contains exactly the source ids', () => {
    const py = readFileSync(pyPath, 'utf8')
    const pyIds = [...py.matchAll(/^\s{8}"value": "([^"]+)",$/gm)].map((m) => m[1])
    expect(pyIds).toEqual(sourceModelIds())
  })

  it('default model is active (not deprecated) in the vendored copy', () => {
    const def = ACTIVE_COPILOT_MODELS.find((m) => m.value === DEFAULT_COPILOT_MODEL)
    expect(def).toBeDefined()
    const src = readFileSync(sourcePath, 'utf8')
    expect(src).toContain(`DEFAULT_COPILOT_MODEL: CopilotModelValue = '${DEFAULT_COPILOT_MODEL}'`)
  })
})
