# deepseek-plugin-cc

A [Claude Code](https://claude.ai/code) plugin that brings DeepSeek models into your workflow. Five slash commands covering the most common dev tasks, plus a subagent for programmatic delegation — all backed by DeepSeek's direct API or OpenRouter, with zero npm runtime dependencies.

## Commands

| Command | What it does |
|---|---|
| `/deepseek:chat` | Freeform question or task — no implicit context |
| `/deepseek:review` | Code review of your current git diff |
| `/deepseek:rescue` | Delegate a hard coding task with full project context |
| `/deepseek:tests` | Generate tests for a source file (auto-detects framework) |
| `/deepseek:script` | Write a one-off script or automation |

All commands support `--model deepseek-chat|deepseek-reasoner|deepseek-v4` to override the default model.

---

## Prerequisites

### 1. Claude Code

Install the Claude Code CLI:

```bash
npm install -g @anthropic-ai/claude-code
```

Or download the [desktop app](https://claude.ai/code).

### 2. Node.js 18+

```bash
node --version   # must be v18.18.0 or higher
```

Download from [nodejs.org](https://nodejs.org) if needed.

### 3. A DeepSeek or OpenRouter API key

**DeepSeek direct** (recommended — cheapest):
- Sign up at [platform.deepseek.com](https://platform.deepseek.com)
- Create an API key under API Keys

**OpenRouter** (alternative — access multiple providers):
- Sign up at [openrouter.ai](https://openrouter.ai)
- Create an API key under Keys

---

## Installation

### Step 1: Set your API key

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# DeepSeek direct (default)
export DEEPSEEK_API_KEY=sk-...

# OpenRouter (if using OpenRouter instead)
export OPENROUTER_API_KEY=sk-or-...
export DEEPSEEK_PROVIDER=openrouter
```

Reload your shell: `source ~/.zshrc`

### Step 2: Install the plugin in Claude Code

Open Claude Code and run these three commands:

```
/plugin marketplace add aivsomkar/deepseek-plugin-cc
/plugin install deepseek-plugin-cc@deepseek-plugin-cc
/reload-plugins
```

### Step 3: Verify

```
/deepseek:chat say hello in one word
```

You should see a response stream in from DeepSeek.

---

## Configuration

### Switching providers

```bash
# Use DeepSeek direct API (default)
export DEEPSEEK_PROVIDER=deepseek

# Use OpenRouter
export DEEPSEEK_PROVIDER=openrouter
```

### Changing the default model

```bash
# Fast and cheap (default)
export DEEPSEEK_MODEL=deepseek-chat

# Stronger reasoning (slower, costs more)
export DEEPSEEK_MODEL=deepseek-reasoner
```

### Available models

| Name | Best for |
|---|---|
| `deepseek-chat` | Chat, review, scripts, tests — everyday use |
| `deepseek-reasoner` | Complex refactors, hard bugs, tricky edge cases |
| `deepseek-v4` | Latest model (when available) |

Pass `--model <name>` to any command to override for that invocation:

```
/deepseek:rescue refactor the auth module --model deepseek-reasoner
```

---

## Command Reference

### `/deepseek:chat`

Freeform query. Your input is the prompt — no project context attached.

```
/deepseek:chat explain the difference between TCP and UDP
/deepseek:chat --model deepseek-reasoner what are the tradeoffs of CQRS?
```

### `/deepseek:review`

Reviews your current git diff. Structured output: Issues Found, Suggestions, Security Concerns, Verdict.

```
/deepseek:review
/deepseek:review --base main
/deepseek:review --model deepseek-reasoner --base main
```

### `/deepseek:rescue`

Delegates a task to DeepSeek. Automatically includes:
- Your project's directory tree
- Any source files you mention by path in the task description

```
/deepseek:rescue add pagination to the users API endpoint
/deepseek:rescue refactor src/auth.ts to use OAuth --model deepseek-reasoner
```

### `/deepseek:tests`

Generates tests for a source file. Auto-detects your test framework from `package.json`, `pyproject.toml`, or `go.mod`. Produces happy path, edge cases, error cases, and mocks.

```
/deepseek:tests src/utils/parser.ts
/deepseek:tests --framework pytest src/auth.py
/deepseek:tests --model deepseek-reasoner src/billing/invoice.ts
```

Supported frameworks: `jest`, `vitest`, `mocha`, `jasmine`, `pytest`, `go test`

### `/deepseek:script`

Writes a one-off script or automation. Passes your project's directory tree as context so it knows what files exist.

```
/deepseek:script bash script to rename all .jpeg files to .jpg in ./assets
/deepseek:script python script to merge all CSV files in ./data into one
```

---

## Subagent

The plugin also registers a `deepseek-agent` subagent. Claude Code can dispatch it automatically when delegating tasks — it routes to the appropriate command script based on the task type.

---

## Troubleshooting

**`Error: DEEPSEEK_API_KEY is not set`**
Add `export DEEPSEEK_API_KEY=sk-...` to your shell profile and reload it.

**`Rate limited by DeepSeek API — wait a moment and retry.`**
You've hit the API rate limit. Wait a few seconds and try again.

**Commands not found after install**
Run `/reload-plugins` in Claude Code.

**`$CLAUDE_PLUGIN_DIR` not resolving**
If commands fail with a path error, the plugin can be found with:
```bash
find ~/.claude -name "deepseek-core.js" -path "*/scripts/*" | head -1 | xargs dirname
```
Open an issue if this happens — it means Claude Code isn't setting `$CLAUDE_PLUGIN_DIR` as expected.

---

## Development

```bash
# Clone
git clone https://github.com/aivsomkar/deepseek-plugin-cc.git
cd deepseek-plugin-cc

# Run tests (no install needed — zero runtime dependencies)
npm test
```

### Project structure

```
deepseek-plugin-cc/
├── .claude-plugin/          # Plugin manifests
├── agents/
│   └── deepseek-agent.md    # Subagent definition
├── commands/
│   ├── chat.md              # /deepseek:chat
│   ├── review.md            # /deepseek:review
│   ├── rescue.md            # /deepseek:rescue
│   ├── tests.md             # /deepseek:tests
│   └── script.md            # /deepseek:script
├── scripts/
│   ├── deepseek-core.js     # Shared: API calls, streaming, provider routing
│   ├── deepseek-chat.js
│   ├── deepseek-review.js
│   ├── deepseek-rescue.js
│   ├── deepseek-tests.js    # Also exports detectFramework
│   └── deepseek-script.js
└── tests/
    ├── deepseek-core.test.js
    └── deepseek-tests.test.js
```

---

## License

MIT
