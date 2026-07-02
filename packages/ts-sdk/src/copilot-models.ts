/**
 * GENERATED FILE — do not edit by hand.
 * Source of truth: packages/ai/src/copilot/models.ts
 * Regenerate: bun scripts/sync-sdk-copilot-models.mjs
 * Sync-gated by copilot-models.sync.test.ts.
 */

export type CopilotModelIcon = 'brain' | 'brainCircuit' | 'zap'
export type CopilotModelProvider = 'openai' | 'anthropic' | 'google' | 'openrouter'
export type CopilotModelCapability =
  | 'vision'
  | 'audio'
  | 'video'
  | 'code'
  | 'reasoning'
  | 'research'

export interface CopilotModelOption {
  /** Canonical model id (send this as `model` on chat/copilot APIs). */
  value: string
  label: string
  /** Tier indicator — zap = fast, brain = balanced, brainCircuit = max reasoning. */
  icon: CopilotModelIcon
  provider: CopilotModelProvider
  capabilities?: readonly CopilotModelCapability[]
  /** Present ⇒ retired: requests transparently remap to `successor`. */
  deprecated?: { successor: string; since: string }
}

/** Every model id the picker has ever exposed (deprecated ids stay valid input). */
export const COPILOT_MODELS: readonly CopilotModelOption[] = [
  {
    value: 'gpt-4.1',
    label: 'gpt-4.1',
    icon: 'zap',
    provider: 'openai',
    deprecated: {
      successor: 'gpt-5-mini',
      since: '2026-06-12',
    },
  },
  {
    value: 'gpt-5-mini',
    label: 'gpt-5-mini',
    icon: 'zap',
    provider: 'openai',
    capabilities: ['code'],
  },
  {
    value: 'gpt-5',
    label: 'gpt-5',
    icon: 'brain',
    provider: 'openai',
    deprecated: {
      successor: 'gpt-5.1',
      since: '2026-06-12',
    },
  },
  {
    value: 'gpt-5.1',
    label: 'gpt-5.1',
    icon: 'brain',
    provider: 'openai',
    capabilities: ['vision', 'code', 'reasoning'],
  },
  {
    value: 'gpt-5.2',
    label: 'gpt-5.2',
    icon: 'brainCircuit',
    provider: 'openai',
    capabilities: ['vision', 'code', 'reasoning', 'research'],
  },
  {
    value: 'o3',
    label: 'o3',
    icon: 'brainCircuit',
    provider: 'openai',
    deprecated: {
      successor: 'gpt-5.2',
      since: '2026-06-12',
    },
  },
  {
    value: 'claude-haiku-4-5',
    label: 'claude-haiku-4-5',
    icon: 'zap',
    provider: 'anthropic',
    deprecated: {
      successor: 'gpt-5-mini',
      since: '2026-06-12',
    },
  },
  {
    value: 'claude-sonnet-4-6',
    label: 'claude-sonnet-4-6',
    icon: 'brain',
    provider: 'anthropic',
    capabilities: ['vision', 'code', 'reasoning'],
  },
  {
    value: 'claude-opus-4-8',
    label: 'claude-opus-4-8',
    icon: 'brainCircuit',
    provider: 'anthropic',
    capabilities: ['vision', 'code', 'reasoning', 'research'],
  },
  {
    value: 'gemini-3.1-flash-lite',
    label: 'gemini-3.1-flash-lite',
    icon: 'zap',
    provider: 'google',
    capabilities: ['vision', 'code'],
  },
  {
    value: 'gemini-3.5-flash',
    label: 'gemini-3.5-flash',
    icon: 'brain',
    provider: 'google',
    capabilities: ['vision', 'audio', 'video', 'code', 'reasoning'],
  },
  {
    value: 'gemini-3.1-pro-preview',
    label: 'gemini-3.1-pro',
    icon: 'brainCircuit',
    provider: 'google',
    capabilities: ['vision', 'audio', 'video', 'code', 'reasoning', 'research'],
  },
  {
    value: 'openai/gpt-oss-120b',
    label: 'gpt-oss-120b',
    icon: 'zap',
    provider: 'openrouter',
    capabilities: ['code', 'reasoning'],
  },
  {
    value: 'qwen/qwen3-coder',
    label: 'Qwen3 Coder',
    icon: 'zap',
    provider: 'openrouter',
    capabilities: ['code'],
  },
  {
    value: 'moonshotai/kimi-k2.6',
    label: 'Kimi K2.6',
    icon: 'brain',
    provider: 'openrouter',
    capabilities: ['code', 'reasoning'],
  },
  {
    value: 'deepseek/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    icon: 'brain',
    provider: 'openrouter',
    capabilities: ['code', 'reasoning'],
  },
]

/** Models currently selectable in pickers (deprecated entries filtered out). */
export const ACTIVE_COPILOT_MODELS: readonly CopilotModelOption[] = COPILOT_MODELS.filter(
  (m) => !m.deprecated
)

export const DEFAULT_COPILOT_MODEL = 'gemini-3.5-flash'

/** Section order for grouped pickers. */
export const COPILOT_PROVIDER_ORDER: readonly CopilotModelProvider[] = [
  'anthropic',
  'openai',
  'google',
  'openrouter',
]

export const COPILOT_PROVIDER_LABELS: Record<CopilotModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  openrouter: 'Open Source',
}
