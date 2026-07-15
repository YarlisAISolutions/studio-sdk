"""GENERATED FILE — do not edit by hand.
Source of truth: packages/ai/src/copilot/models.ts
Regenerate: bun scripts/sync-sdk-copilot-models.mjs
Sync-gated by packages/ts-sdk/src/copilot-models.sync.test.ts.
"""

# Every model id the picker has ever exposed (deprecated ids stay valid input;
# requests for a deprecated id transparently remap to its "successor").
COPILOT_MODELS = [
    {
        "value": "gpt-4.1",
        "label": "gpt-4.1",
        "icon": "zap",
        "provider": "openai",
        "deprecated": {
            "successor": "gpt-5-mini",
            "since": "2026-06-12"
        }
    },
    {
        "value": "gpt-5-mini",
        "label": "gpt-5-mini",
        "icon": "zap",
        "provider": "openai",
        "capabilities": [
            "code"
        ]
    },
    {
        "value": "gpt-5",
        "label": "gpt-5",
        "icon": "brain",
        "provider": "openai",
        "deprecated": {
            "successor": "gpt-5.3",
            "since": "2026-06-12"
        }
    },
    {
        "value": "gpt-5.1",
        "label": "gpt-5.1",
        "icon": "brain",
        "provider": "openai",
        "deprecated": {
            "successor": "gpt-5.3",
            "since": "2026-07-10"
        }
    },
    {
        "value": "gpt-5.3",
        "label": "gpt-5.3",
        "icon": "brain",
        "provider": "openai",
        "capabilities": [
            "vision",
            "code",
            "reasoning"
        ]
    },
    {
        "value": "gpt-5.2",
        "label": "gpt-5.2",
        "icon": "brainCircuit",
        "provider": "openai",
        "deprecated": {
            "successor": "gpt-5.3-pro",
            "since": "2026-07-10"
        }
    },
    {
        "value": "gpt-5.3-pro",
        "label": "gpt-5.3-pro",
        "icon": "brainCircuit",
        "provider": "openai",
        "capabilities": [
            "vision",
            "code",
            "reasoning",
            "research"
        ]
    },
    {
        "value": "o3",
        "label": "o3",
        "icon": "brainCircuit",
        "provider": "openai",
        "deprecated": {
            "successor": "gpt-5.3-pro",
            "since": "2026-06-12"
        }
    },
    {
        "value": "claude-haiku-4-5",
        "label": "claude-haiku-4-5",
        "icon": "zap",
        "provider": "anthropic",
        "deprecated": {
            "successor": "gpt-5-mini",
            "since": "2026-06-12"
        }
    },
    {
        "value": "claude-sonnet-4-6",
        "label": "claude-sonnet-4-6",
        "icon": "brain",
        "provider": "anthropic",
        "deprecated": {
            "successor": "claude-sonnet-4-7",
            "since": "2026-07-10"
        }
    },
    {
        "value": "claude-sonnet-4-7",
        "label": "claude-sonnet-4-7",
        "icon": "brain",
        "provider": "anthropic",
        "capabilities": [
            "vision",
            "code",
            "reasoning"
        ]
    },
    {
        "value": "claude-opus-4-8",
        "label": "claude-opus-4-8",
        "icon": "brainCircuit",
        "provider": "anthropic",
        "deprecated": {
            "successor": "claude-opus-4-9",
            "since": "2026-07-10"
        }
    },
    {
        "value": "claude-opus-4-9",
        "label": "claude-opus-4-9",
        "icon": "brainCircuit",
        "provider": "anthropic",
        "capabilities": [
            "vision",
            "code",
            "reasoning",
            "research"
        ]
    },
    {
        "value": "gemini-3.1-flash-lite",
        "label": "gemini-3.1-flash-lite",
        "icon": "zap",
        "provider": "google",
        "deprecated": {
            "successor": "gemini-3.5-flash-lite",
            "since": "2026-07-10"
        }
    },
    {
        "value": "gemini-3.5-flash-lite",
        "label": "gemini-3.5-flash-lite",
        "icon": "zap",
        "provider": "google",
        "capabilities": [
            "vision",
            "code"
        ]
    },
    {
        "value": "gemini-3.5-flash",
        "label": "gemini-3.5-flash",
        "icon": "brain",
        "provider": "google",
        "capabilities": [
            "vision",
            "audio",
            "video",
            "code",
            "reasoning"
        ]
    },
    {
        "value": "gemini-3.1-pro-preview",
        "label": "gemini-3.1-pro",
        "icon": "brainCircuit",
        "provider": "google",
        "deprecated": {
            "successor": "gemini-3.5-pro",
            "since": "2026-07-10"
        }
    },
    {
        "value": "gemini-3.5-pro",
        "label": "gemini-3.5-pro",
        "icon": "brainCircuit",
        "provider": "google",
        "capabilities": [
            "vision",
            "audio",
            "video",
            "code",
            "reasoning",
            "research"
        ]
    },
    {
        "value": "openai/gpt-oss-120b",
        "label": "gpt-oss-120b",
        "icon": "zap",
        "provider": "openrouter",
        "capabilities": [
            "code",
            "reasoning"
        ]
    },
    {
        "value": "qwen/qwen3-coder",
        "label": "Qwen3 Coder",
        "icon": "zap",
        "provider": "openrouter",
        "capabilities": [
            "code"
        ]
    },
    {
        "value": "moonshotai/kimi-k2.6",
        "label": "Kimi K2.6",
        "icon": "brain",
        "provider": "openrouter",
        "deprecated": {
            "successor": "moonshotai/kimi-k3",
            "since": "2026-07-10"
        }
    },
    {
        "value": "moonshotai/kimi-k3",
        "label": "Kimi K3",
        "icon": "brain",
        "provider": "openrouter",
        "capabilities": [
            "code",
            "reasoning"
        ]
    },
    {
        "value": "deepseek/deepseek-v4-pro",
        "label": "DeepSeek V4 Pro",
        "icon": "brain",
        "provider": "openrouter",
        "deprecated": {
            "successor": "deepseek/deepseek-v4.1",
            "since": "2026-07-10"
        }
    },
    {
        "value": "deepseek/deepseek-v4.1",
        "label": "DeepSeek V4.1",
        "icon": "brain",
        "provider": "openrouter",
        "capabilities": [
            "code",
            "reasoning"
        ]
    },
    {
        "value": "nousresearch/hermes-3-llama-3.1-8b",
        "label": "Hermes 3 8B",
        "icon": "zap",
        "provider": "openrouter",
        "capabilities": [
            "code"
        ]
    },
    {
        "value": "nousresearch/hermes-3-llama-3.1-70b",
        "label": "Hermes 3 70B",
        "icon": "brain",
        "provider": "openrouter",
        "capabilities": [
            "code",
            "reasoning"
        ]
    },
    {
        "value": "nousresearch/hermes-3-llama-3.1-405b",
        "label": "Hermes 3 405B",
        "icon": "brainCircuit",
        "provider": "openrouter",
        "capabilities": [
            "code",
            "reasoning"
        ]
    }
]

# Models currently selectable in pickers (deprecated entries filtered out).
ACTIVE_COPILOT_MODELS = [m for m in COPILOT_MODELS if "deprecated" not in m]

DEFAULT_COPILOT_MODEL = "gemini-3.5-flash"

# Section order for grouped pickers.
COPILOT_PROVIDER_ORDER = ["anthropic","openai","google","openrouter"]

COPILOT_PROVIDER_LABELS = {"openai":"OpenAI","anthropic":"Anthropic","google":"Google","openrouter":"Open Source"}
