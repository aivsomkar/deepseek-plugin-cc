# DeepSeek Plugin for Claude Code — Design Spec

**Date:** 2026-05-01  
**Status:** Approved

---

## Overview

`deepseek-plugin-cc` is a Claude Code plugin that bridges DeepSeek models into the Claude Code workflow. It exposes five slash commands and one subagent covering the most common use cases: freeform chat, code review, task rescue, test generation, and quick script/automation writing. It supports both the DeepSeek direct API and OpenRouter as providers, switchable via a single environment variable.

---

## Goals

- Let users query DeepSeek models without leaving Claude Code
- Support DeepSeek direct API and OpenRouter with zero per-command friction
- Cover five distinct use cases with focused, purpose-built commands
- Ship with no npm runtime dependencies (Node.js built-ins only)
- Follow the established Claude Code plugin convention (`.claude-plugin/` manifest + `commands/*.md` + `agents/*.md` + `scripts/`)

---

## Non-Goals

- Background job management / async task queuing (synchronous streaming is sufficient)
- A GUI or TUI — output is plain text streamed to stdout
- Support for non-DeepSeek models via OpenRouter (users can pass any model string but the plugin is DeepSeek-focused)
- Bundling or compiling — plain ESM `.js` files, no build step

---

## File Layout

```
deepseek-plugin-cc/
├── .claude-plugin/
│   ├── marketplace.json
│   └── plugin.json
├── agents/
│   └── deepseek-agent.md
├── commands/
│   ├── chat.md
│   ├── review.md
│   ├── rescue.md
│   ├── tests.md
│   └── script.md
├── scripts/
│   ├── deepseek-core.js
│   ├── deepseek-chat.js
│   ├── deepseek-review.js
│   ├── deepseek-rescue.js
│   ├── deepseek-tests.js
│   └── deepseek-script.js
├── tests/
│   └── deepseek-core.test.js
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-01-deepseek-plugin-design.md
└── package.json
```

---

## Installation

```bash
# In Claude Code
/plugin marketplace add <github-username>/deepseek-plugin-cc
/plugin install deepseek@deepseek-plugin-cc
/reload-plugins
```

Add to shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# Required for DeepSeek direct
export DEEPSEEK_API_KEY=sk-...

# Required for OpenRouter (only if DEEPSEEK_PROVIDER=openrouter)
export OPENROUTER_API_KEY=sk-or-...

# Provider selection (default: deepseek)
export DEEPSEEK_PROVIDER=deepseek      # or: openrouter

# Default model (default: deepseek-chat)
export DEEPSEEK_MODEL=deepseek-chat
```

---

## Architecture

### Provider Routing

`deepseek-core.js` reads `DEEPSEEK_PROVIDER` at runtime:

| Provider | Base URL | Auth header | Model prefix |
|---|---|---|---|
| `deepseek` | `https://api.deepseek.com/chat/completions` | `DEEPSEEK_API_KEY` | none |
| `openrouter` | `https://openrouter.ai/api/v1/chat/completions` | `OPENROUTER_API_KEY` | `deepseek/` prepended |

### Model Resolution

Priority order (highest to lowest):
1. `--model <name>` CLI flag passed by the command script
2. `DEEPSEEK_MODEL` environment variable
3. Hardcoded default: `deepseek-chat`

Named models and their API identifiers:

| Name | DeepSeek API | OpenRouter |
|---|---|---|
| `deepseek-chat` | `deepseek-chat` | `deepseek/deepseek-chat` |
| `deepseek-reasoner` | `deepseek-reasoner` | `deepseek/deepseek-r1` |
| `deepseek-v4` | `deepseek-v4` | `deepseek/deepseek-v4` |
| any other string | passed through as-is | `deepseek/<string>` |

### Streaming

Core uses Node.js `https` module with SSE (`text/event-stream`) parsing. Tokens are written to stdout as they arrive. The process exits with code `0` on success, `1` on any error.

### Core CLI Interface

Command scripts call core via `spawnSync`:

```
node scripts/deepseek-core.js [--model <name>] [--system <text>] [--max-tokens <n>] <prompt>
```

- `--system` — system prompt (built by each command script)
- `--max-tokens` — optional token limit (default: API default)
- `<prompt>` — user prompt (built by each command script)

---

## Commands

### `/deepseek:chat`

Freeform query with no implicit context. The user's argument is the entire prompt.

```
/deepseek:chat [--model <name>] <question or task>
```

**Example:** `/deepseek:chat explain the tradeoffs of LSM trees`

---

### `/deepseek:review`

Reviews the current git diff. Sends diff content with a structured review system prompt requesting: issues found, suggestions, security concerns, and a pass/fail verdict.

```
/deepseek:review [--model <name>] [--base <ref>]
```

- Default: diffs `HEAD` (staged + unstaged)
- `--base main`: diffs current branch against `main`
- Fallback when no git repo: uses `git diff --cached` (staged only), prints a warning

**Example:** `/deepseek:review --base main`

---

### `/deepseek:rescue`

Delegates a hard coding task to DeepSeek with full file context. Reads the files mentioned in the prompt (resolved relative to working dir) plus the directory tree for orientation. Streams the response.

```
/deepseek:rescue [--model <name>] <task description>
```

Recommended to use `--model deepseek-reasoner` for complex refactors or architectural decisions.

**Example:** `/deepseek:rescue refactor the auth module to support OAuth --model deepseek-reasoner`

---

### `/deepseek:tests`

Generates tests for a specified source file or function. Auto-detects the test framework:

| Detection source | Frameworks detected |
|---|---|
| `package.json` `devDependencies` | jest, vitest, mocha, jasmine |
| `pyproject.toml` / `pytest.ini` | pytest |
| `go.mod` present | go test |
| File extension fallback | `.test.ts` → jest/vitest, `_test.go` → go test |

Generates: happy path tests, edge cases, error/exception cases, mocks for external dependencies.

```
/deepseek:tests [--model <name>] [--framework <name>] <source-file>
```

`--framework` overrides auto-detection.

**Example:** `/deepseek:tests src/utils/parser.ts`

---

### `/deepseek:script`

Generates a one-off script or automation. Reads the current directory tree (excluding `node_modules`, `.git`, `dist`, `__pycache__`, `.next`) and passes it alongside the user's description.

```
/deepseek:script [--model <name>] <description>
```

Output is the script itself, ready to copy-paste or pipe to a file.

**Example:** `/deepseek:script bash script to rename all .jpeg files to .jpg in ./assets`

---

## Subagent

`agents/deepseek-agent.md` defines a `deepseek-agent` subagent for programmatic delegation from within Claude Code conversations via the `Agent` tool.

```yaml
---
name: deepseek-agent
description: |
  Use this agent to delegate tasks to DeepSeek — code review, test generation,
  rescue tasks, quick scripts, or freeform questions. Prefer deepseek-reasoner
  for hard reasoning tasks, deepseek-chat for everything else.
tools: ["Bash", "Glob", "Read"]
model: inherit
color: purple
---
```

The agent body instructs it to invoke the appropriate `deepseek-<command>.js` script directly via Bash.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `DEEPSEEK_API_KEY` missing (provider=deepseek) | Print: `Error: DEEPSEEK_API_KEY is not set. Add it to your shell profile.` Exit 1. |
| `OPENROUTER_API_KEY` missing (provider=openrouter) | Print: `Error: OPENROUTER_API_KEY is not set. Add it to your shell profile.` Exit 1. |
| HTTP 429 rate limit | Print: `Rate limited by DeepSeek API — wait a moment and retry.` Exit 1. |
| HTTP 4xx/5xx | Print: `API error <status>: <message from response body>` Exit 1. |
| Source file not found (`/deepseek:tests`) | Print: `File not found: <path>` Exit 1. |
| No git repo (`/deepseek:review`) | Warn, fall back to `git diff --cached`. |
| Unknown `--model` string | Pass through as-is, no error (forward compatibility). |

---

## Testing

`tests/deepseek-core.test.js` uses Node.js built-in test runner (`node:test`). Covers:

- Provider URL selection (deepseek vs openrouter)
- Model name resolution (named models, passthrough, env var default, flag override)
- OpenRouter model prefix logic
- Error message formatting for each error scenario
- Argument parsing (`--model`, `--system`, `--max-tokens`)

Run with: `node --test tests/`

---

## `package.json`

```json
{
  "name": "deepseek-plugin-cc",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18.18.0" },
  "scripts": { "test": "node --test tests/" }
}
```

No runtime dependencies. No build step.
