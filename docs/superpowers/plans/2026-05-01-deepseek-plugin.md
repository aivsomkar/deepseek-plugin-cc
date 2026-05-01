# DeepSeek Plugin for Claude Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin with 5 slash commands + 1 subagent that routes requests to DeepSeek models via direct API or OpenRouter, with a shared streaming core and zero npm runtime dependencies.

**Architecture:** `scripts/deepseek-core.js` exports pure functions for arg parsing, provider routing, model resolution, and streaming; five thin command scripts import core and assemble prompts; markdown command files wire everything into Claude Code's slash command system.

**Tech Stack:** Node.js 18+ ESM, `node:https` for streaming SSE, `node:test` for testing, `node:child_process` for git/find, no runtime npm dependencies.

---

## File Map

| File | Responsibility |
|---|---|
| `.claude-plugin/marketplace.json` | Registers plugin with Claude Code marketplace |
| `.claude-plugin/plugin.json` | Plugin identity (name, version, description) |
| `package.json` | Project metadata, test script, engines |
| `scripts/deepseek-core.js` | Exports: `parseArgs`, `resolveProvider`, `resolveModel`, `resolveEndpoint`, `resolveApiKey`, `streamChat` |
| `scripts/deepseek-chat.js` | Entry point for `/deepseek:chat` |
| `scripts/deepseek-review.js` | Entry point for `/deepseek:review`; reads git diff |
| `scripts/deepseek-rescue.js` | Entry point for `/deepseek:rescue`; reads dir tree + referenced files |
| `scripts/deepseek-tests.js` | Entry point for `/deepseek:tests`; exports `detectFramework` |
| `scripts/deepseek-script.js` | Entry point for `/deepseek:script`; reads dir tree |
| `commands/chat.md` | Slash command definition for `/deepseek:chat` |
| `commands/review.md` | Slash command definition for `/deepseek:review` |
| `commands/rescue.md` | Slash command definition for `/deepseek:rescue` |
| `commands/tests.md` | Slash command definition for `/deepseek:tests` |
| `commands/script.md` | Slash command definition for `/deepseek:script` |
| `agents/deepseek-agent.md` | Subagent definition |
| `tests/deepseek-core.test.js` | Unit tests for core functions |
| `tests/deepseek-tests.test.js` | Unit tests for `detectFramework` |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `.claude-plugin/plugin.json`

- [ ] **Step 1: Create `package.json`**

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

- [ ] **Step 2: Create `.claude-plugin/marketplace.json`**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "deepseek-plugin-cc",
  "owner": { "name": "aivsomkar" },
  "plugins": [
    {
      "name": "deepseek-plugin-cc",
      "version": "1.0.0",
      "source": "./",
      "category": "integrations"
    }
  ]
}
```

- [ ] **Step 3: Create `.claude-plugin/plugin.json`**

```json
{
  "name": "deepseek-plugin-cc",
  "version": "1.0.0",
  "description": "Use DeepSeek models from Claude Code — chat, code review, task rescue, test generation, and script writing.",
  "author": { "name": "aivsomkar" }
}
```

- [ ] **Step 4: Verify Node version**

Run: `node --version`
Expected: `v18.x.x` or higher.

- [ ] **Step 5: Commit**

```bash
git add package.json .claude-plugin/marketplace.json .claude-plugin/plugin.json
git commit -m "feat: add project scaffold and plugin manifests"
```

---

## Task 2: Core — Argument Parsing (TDD)

**Files:**
- Create: `tests/deepseek-core.test.js`
- Create: `scripts/deepseek-core.js` (partial — `parseArgs` only)

- [ ] **Step 1: Write the failing test**

Create `tests/deepseek-core.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../scripts/deepseek-core.js';

test('parseArgs: extracts --model flag', () => {
  const result = parseArgs(['--model', 'deepseek-reasoner', 'hello world']);
  assert.equal(result.model, 'deepseek-reasoner');
  assert.equal(result.prompt, 'hello world');
});

test('parseArgs: extracts --system flag', () => {
  const result = parseArgs(['--system', 'you are helpful', 'my question']);
  assert.equal(result.system, 'you are helpful');
  assert.equal(result.prompt, 'my question');
});

test('parseArgs: extracts --max-tokens flag', () => {
  const result = parseArgs(['--max-tokens', '1000', 'prompt text']);
  assert.equal(result.maxTokens, 1000);
  assert.equal(result.prompt, 'prompt text');
});

test('parseArgs: joins multiple prompt words', () => {
  const result = parseArgs(['explain', 'this', 'to', 'me']);
  assert.equal(result.prompt, 'explain this to me');
});

test('parseArgs: returns nulls for missing flags', () => {
  const result = parseArgs(['just a prompt']);
  assert.equal(result.model, null);
  assert.equal(result.system, null);
  assert.equal(result.maxTokens, null);
});

test('parseArgs: empty argv gives empty prompt', () => {
  const result = parseArgs([]);
  assert.equal(result.prompt, '');
  assert.equal(result.model, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/deepseek-core.test.js`
Expected: Error — `Cannot find module '../scripts/deepseek-core.js'`

- [ ] **Step 3: Create `scripts/deepseek-core.js` with `parseArgs`**

```javascript
import { request } from 'node:https';

export function parseArgs(argv) {
  const result = { model: null, system: null, maxTokens: null, prompt: '' };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model')       { result.model = argv[++i]; }
    else if (argv[i] === '--system') { result.system = argv[++i]; }
    else if (argv[i] === '--max-tokens') { result.maxTokens = parseInt(argv[++i], 10); }
    else rest.push(argv[i]);
  }
  result.prompt = rest.join(' ');
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/deepseek-core.test.js`
Expected: `▶ parseArgs: extracts --model flag` ... 6 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add scripts/deepseek-core.js tests/deepseek-core.test.js
git commit -m "feat: add core module with parseArgs (TDD)"
```

---

## Task 3: Core — Provider Routing & Model Resolution (TDD)

**Files:**
- Modify: `tests/deepseek-core.test.js`
- Modify: `scripts/deepseek-core.js`

- [ ] **Step 1: Add failing tests for provider/model/endpoint functions**

Append to `tests/deepseek-core.test.js`:

```javascript
import { resolveProvider, resolveModel, resolveEndpoint } from '../scripts/deepseek-core.js';

test('resolveProvider: defaults to deepseek', () => {
  delete process.env.DEEPSEEK_PROVIDER;
  assert.equal(resolveProvider(), 'deepseek');
});

test('resolveProvider: reads env var', () => {
  process.env.DEEPSEEK_PROVIDER = 'openrouter';
  assert.equal(resolveProvider(), 'openrouter');
  delete process.env.DEEPSEEK_PROVIDER;
});

test('resolveModel: deepseek-chat on deepseek provider', () => {
  assert.equal(resolveModel('deepseek-chat', 'deepseek'), 'deepseek-chat');
});

test('resolveModel: deepseek-chat on openrouter provider', () => {
  assert.equal(resolveModel('deepseek-chat', 'openrouter'), 'deepseek/deepseek-chat');
});

test('resolveModel: deepseek-reasoner maps to r1 on openrouter', () => {
  assert.equal(resolveModel('deepseek-reasoner', 'openrouter'), 'deepseek/deepseek-r1');
});

test('resolveModel: deepseek-v4 on deepseek provider', () => {
  assert.equal(resolveModel('deepseek-v4', 'deepseek'), 'deepseek-v4');
});

test('resolveModel: deepseek-v4 on openrouter provider', () => {
  assert.equal(resolveModel('deepseek-v4', 'openrouter'), 'deepseek/deepseek-v4');
});

test('resolveModel: unknown model passes through on deepseek', () => {
  assert.equal(resolveModel('deepseek-v5', 'deepseek'), 'deepseek-v5');
});

test('resolveModel: unknown model gets deepseek/ prefix on openrouter', () => {
  assert.equal(resolveModel('deepseek-v5', 'openrouter'), 'deepseek/deepseek-v5');
});

test('resolveModel: uses DEEPSEEK_MODEL env var when no flag', () => {
  process.env.DEEPSEEK_MODEL = 'deepseek-reasoner';
  assert.equal(resolveModel(null, 'deepseek'), 'deepseek-reasoner');
  delete process.env.DEEPSEEK_MODEL;
});

test('resolveModel: --model flag overrides env var', () => {
  process.env.DEEPSEEK_MODEL = 'deepseek-reasoner';
  assert.equal(resolveModel('deepseek-chat', 'deepseek'), 'deepseek-chat');
  delete process.env.DEEPSEEK_MODEL;
});

test('resolveModel: falls back to deepseek-chat when nothing set', () => {
  delete process.env.DEEPSEEK_MODEL;
  assert.equal(resolveModel(null, 'deepseek'), 'deepseek-chat');
});

test('resolveEndpoint: deepseek provider', () => {
  const ep = resolveEndpoint('deepseek');
  assert.equal(ep.hostname, 'api.deepseek.com');
  assert.equal(ep.path, '/chat/completions');
});

test('resolveEndpoint: openrouter provider', () => {
  const ep = resolveEndpoint('openrouter');
  assert.equal(ep.hostname, 'openrouter.ai');
  assert.equal(ep.path, '/api/v1/chat/completions');
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `node --test tests/deepseek-core.test.js`
Expected: The 6 existing tests pass; the new ones fail with `resolveProvider is not a function`.

- [ ] **Step 3: Add `resolveProvider`, `resolveModel`, `resolveEndpoint` to `scripts/deepseek-core.js`**

Add after `parseArgs`:

```javascript
const MODEL_MAP = {
  'deepseek-chat':     { deepseek: 'deepseek-chat',     openrouter: 'deepseek/deepseek-chat' },
  'deepseek-reasoner': { deepseek: 'deepseek-reasoner', openrouter: 'deepseek/deepseek-r1' },
  'deepseek-v4':       { deepseek: 'deepseek-v4',       openrouter: 'deepseek/deepseek-v4' },
};

export function resolveProvider() {
  return process.env.DEEPSEEK_PROVIDER || 'deepseek';
}

export function resolveModel(flagModel, provider) {
  const name = flagModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  if (provider === 'openrouter') {
    return MODEL_MAP[name]?.openrouter ?? `deepseek/${name}`;
  }
  return MODEL_MAP[name]?.deepseek ?? name;
}

export function resolveEndpoint(provider) {
  if (provider === 'openrouter') {
    return { hostname: 'openrouter.ai', path: '/api/v1/chat/completions' };
  }
  return { hostname: 'api.deepseek.com', path: '/chat/completions' };
}
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `node --test tests/deepseek-core.test.js`
Expected: All 20 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add scripts/deepseek-core.js tests/deepseek-core.test.js
git commit -m "feat: add provider routing and model resolution to core (TDD)"
```

---

## Task 4: Core — API Key Resolution & Streaming

**Files:**
- Modify: `scripts/deepseek-core.js`

- [ ] **Step 1: Add `resolveApiKey` to `scripts/deepseek-core.js`**

Add after `resolveEndpoint`:

```javascript
export function resolveApiKey(provider) {
  if (provider === 'openrouter') {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      console.error('Error: OPENROUTER_API_KEY is not set. Add it to your shell profile.');
      process.exit(1);
    }
    return key;
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error('Error: DEEPSEEK_API_KEY is not set. Add it to your shell profile.');
    process.exit(1);
  }
  return key;
}
```

- [ ] **Step 2: Add `streamChat` to `scripts/deepseek-core.js`**

Add after `resolveApiKey`:

```javascript
export function streamChat({ model, apiKey, endpoint, system, prompt, maxTokens }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const body = JSON.stringify({
    model,
    messages,
    stream: true,
    ...(maxTokens != null ? { max_tokens: maxTokens } : {}),
  });

  return new Promise((resolve) => {
    const req = request(
      {
        hostname: endpoint.hostname,
        path: endpoint.path,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode === 429) {
          console.error('Rate limited by DeepSeek API — wait a moment and retry.');
          process.exit(1);
        }
        if (res.statusCode >= 400) {
          let raw = '';
          res.on('data', (c) => { raw += c; });
          res.on('end', () => {
            let msg = raw;
            try { msg = JSON.parse(raw).error?.message || raw; } catch {}
            console.error(`API error ${res.statusCode}: ${msg}`);
            process.exit(1);
          });
          return;
        }

        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk.toString();
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const token = JSON.parse(data).choices?.[0]?.delta?.content;
              if (token) process.stdout.write(token);
            } catch {}
          }
        });
        res.on('end', () => {
          process.stdout.write('\n');
          resolve();
        });
      }
    );

    req.on('error', (err) => {
      console.error(`Network error: ${err.message}`);
      process.exit(1);
    });

    req.write(body);
    req.end();
  });
}
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

Run: `node --test tests/deepseek-core.test.js`
Expected: All 20 tests still passing.

- [ ] **Step 4: Smoke test with a real API key**

Set your key and run a quick test:
```bash
DEEPSEEK_API_KEY=<your-key> node -e "
import('./scripts/deepseek-core.js').then(async ({ resolveProvider, resolveModel, resolveApiKey, resolveEndpoint, streamChat }) => {
  const provider = resolveProvider();
  const model = resolveModel(null, provider);
  const apiKey = resolveApiKey(provider);
  const endpoint = resolveEndpoint(provider);
  await streamChat({ model, apiKey, endpoint, system: null, prompt: 'Say hello in one word.', maxTokens: 10 });
});
"
```
Expected: A single word streams to stdout.

- [ ] **Step 5: Commit**

```bash
git add scripts/deepseek-core.js
git commit -m "feat: add resolveApiKey and streamChat to core"
```

---

## Task 5: Chat Command

**Files:**
- Create: `scripts/deepseek-chat.js`
- Create: `commands/chat.md`

- [ ] **Step 1: Create `scripts/deepseek-chat.js`**

```javascript
import { parseArgs, resolveProvider, resolveModel, resolveApiKey, resolveEndpoint, streamChat } from './deepseek-core.js';

const args = parseArgs(process.argv.slice(2));

if (!args.prompt) {
  console.error('Usage: deepseek-chat.js [--model <name>] <question or task>');
  process.exit(1);
}

const provider = resolveProvider();
const model = resolveModel(args.model, provider);
const apiKey = resolveApiKey(provider);
const endpoint = resolveEndpoint(provider);
const system = 'You are a helpful, concise coding assistant.';

await streamChat({ model, apiKey, endpoint, system, prompt: args.prompt, maxTokens: args.maxTokens });
```

- [ ] **Step 2: Verify the script runs**

Run: `DEEPSEEK_API_KEY=<your-key> node scripts/deepseek-chat.js explain closures in one sentence`
Expected: A one-sentence explanation streams to stdout.

- [ ] **Step 3: Create `commands/chat.md`**

```markdown
---
description: Freeform query to DeepSeek — ask questions, get code explanations, or request anything
allowed-tools: Bash
argument-hint: "[--model deepseek-chat|deepseek-reasoner|deepseek-v4] <question or task>"
---

Run this command and stream the output:

```bash
node "$CLAUDE_PLUGIN_DIR/scripts/deepseek-chat.js" $ARGUMENTS
```

> **Note for implementers:** If `$CLAUDE_PLUGIN_DIR` is not set by Claude Code, locate the plugin with:
> `find ~/.claude -name "deepseek-chat.js" -path "*/scripts/*" | head -1 | xargs dirname`
> and use that path instead.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/deepseek-chat.js commands/chat.md
git commit -m "feat: add chat command"
```

---

## Task 6: Review Command

**Files:**
- Create: `scripts/deepseek-review.js`
- Create: `commands/review.md`

- [ ] **Step 1: Create `scripts/deepseek-review.js`**

```javascript
import { parseArgs, resolveProvider, resolveModel, resolveApiKey, resolveEndpoint, streamChat } from './deepseek-core.js';
import { execSync } from 'node:child_process';

function getGitDiff(base) {
  try {
    if (base) return execSync(`git diff ${base}...HEAD`, { encoding: 'utf8' });
    return execSync('git diff HEAD', { encoding: 'utf8' });
  } catch {
    console.error('Error: Not a git repository. Run from inside a git project.');
    process.exit(1);
  }
}

const rawArgs = process.argv.slice(2);
let base = null;
const filteredArgs = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--base') { base = rawArgs[++i]; }
  else filteredArgs.push(rawArgs[i]);
}

const args = parseArgs(filteredArgs);
const diff = getGitDiff(base);

if (!diff.trim()) {
  console.log('No changes detected. Nothing to review.');
  process.exit(0);
}

const provider = resolveProvider();
const model = resolveModel(args.model, provider);
const apiKey = resolveApiKey(provider);
const endpoint = resolveEndpoint(provider);

const system = `You are a senior software engineer performing a thorough code review.
Analyze the provided git diff and give feedback in these sections:
1. **Issues Found** — bugs, logic errors, incorrect assumptions
2. **Suggestions** — improvements, best practices, readability
3. **Security Concerns** — vulnerabilities, unsafe patterns (or "None" if clean)
4. **Verdict** — PASS or NEEDS CHANGES

Be direct and specific. Reference file names and line numbers when relevant.`;

const prompt = `Review this git diff:\n\n\`\`\`diff\n${diff}\n\`\`\``;

await streamChat({ model, apiKey, endpoint, system, prompt, maxTokens: args.maxTokens });
```

- [ ] **Step 2: Verify the script runs (requires a git repo with changes)**

Make a small test change to any file, then run:
```bash
DEEPSEEK_API_KEY=<your-key> node scripts/deepseek-review.js
```
Expected: Structured review streams to stdout.

- [ ] **Step 3: Create `commands/review.md`**

```markdown
---
description: Code review of current git changes using DeepSeek
allowed-tools: Bash
argument-hint: "[--model deepseek-chat|deepseek-reasoner] [--base <branch-or-ref>]"
---

Run this command and stream the output:

```bash
node "$CLAUDE_PLUGIN_DIR/scripts/deepseek-review.js" $ARGUMENTS
```
```

- [ ] **Step 4: Commit**

```bash
git add scripts/deepseek-review.js commands/review.md
git commit -m "feat: add review command"
```

---

## Task 7: Rescue Command

**Files:**
- Create: `scripts/deepseek-rescue.js`
- Create: `commands/rescue.md`

- [ ] **Step 1: Create `scripts/deepseek-rescue.js`**

```javascript
import { parseArgs, resolveProvider, resolveModel, resolveApiKey, resolveEndpoint, streamChat } from './deepseek-core.js';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

function getDirTree(cwd) {
  try {
    return execSync(
      `find . -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/__pycache__/*' -not -path '*/.next/*' -maxdepth 4 | sort`,
      { cwd, encoding: 'utf8' }
    );
  } catch {
    return '';
  }
}

function extractFilePaths(text, cwd) {
  const pattern = /(?:^|[\s"'`,(])([.\w][\w./\-]*\.(?:ts|tsx|js|jsx|py|go|rs|rb|java|cs|cpp|c|h|json|yaml|yml|md|sh|bash))/g;
  const matches = [...text.matchAll(pattern)].map((m) => m[1]);
  return [...new Set(matches)]
    .map((p) => resolve(cwd, p))
    .filter((p) => existsSync(p))
    .slice(0, 10);
}

const args = parseArgs(process.argv.slice(2));

if (!args.prompt) {
  console.error('Usage: deepseek-rescue.js [--model <name>] <task description>');
  process.exit(1);
}

const cwd = process.cwd();
const dirTree = getDirTree(cwd);
const filePaths = extractFilePaths(args.prompt, cwd);
const fileContents = filePaths
  .map((p) => {
    try {
      return `\n### ${p}\n\`\`\`\n${readFileSync(p, 'utf8')}\n\`\`\``;
    } catch {
      return '';
    }
  })
  .join('');

const provider = resolveProvider();
const model = resolveModel(args.model, provider);
const apiKey = resolveApiKey(provider);
const endpoint = resolveEndpoint(provider);

const system =
  'You are an expert software engineer. Implement the requested task with complete, working code. Show full file contents when making changes, not just snippets.';

const prompt = `Task: ${args.prompt}

Project structure:
\`\`\`
${dirTree}
\`\`\`
${fileContents}`;

await streamChat({ model, apiKey, endpoint, system, prompt, maxTokens: args.maxTokens });
```

- [ ] **Step 2: Verify the script runs**

Run: `DEEPSEEK_API_KEY=<your-key> node scripts/deepseek-rescue.js write a utility to format bytes as human-readable strings`
Expected: Implementation streams to stdout.

- [ ] **Step 3: Create `commands/rescue.md`**

```markdown
---
description: Delegate a hard coding task to DeepSeek with full project context
allowed-tools: Bash
argument-hint: "[--model deepseek-chat|deepseek-reasoner|deepseek-v4] <task description>"
---

Run this command and stream the output:

```bash
node "$CLAUDE_PLUGIN_DIR/scripts/deepseek-rescue.js" $ARGUMENTS
```

For complex refactors or architectural problems, add `--model deepseek-reasoner` for stronger reasoning.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/deepseek-rescue.js commands/rescue.md
git commit -m "feat: add rescue command"
```

---

## Task 8: Tests Command + Framework Detection (TDD)

**Files:**
- Create: `tests/deepseek-tests.test.js`
- Create: `scripts/deepseek-tests.js`
- Create: `commands/tests.md`

- [ ] **Step 1: Write failing tests for `detectFramework`**

Create `tests/deepseek-tests.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectFramework } from '../scripts/deepseek-tests.js';

function tempDir() {
  const dir = join(tmpdir(), `ds-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir);
  return dir;
}

test('detectFramework: detects vitest (takes priority over jest)', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '^1.0.0', jest: '^29.0.0' } }));
  assert.equal(detectFramework(dir), 'vitest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects jest', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { jest: '^29.0.0' } }));
  assert.equal(detectFramework(dir), 'jest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects mocha', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { mocha: '^10.0.0' } }));
  assert.equal(detectFramework(dir), 'mocha');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects pytest from pyproject.toml', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'pyproject.toml'), '[tool.pytest.ini_options]\n');
  assert.equal(detectFramework(dir), 'pytest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects pytest from pytest.ini', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'pytest.ini'), '[pytest]\n');
  assert.equal(detectFramework(dir), 'pytest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects go test from go.mod', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'go.mod'), 'module myapp\n\ngo 1.21\n');
  assert.equal(detectFramework(dir), 'go test');
  rmSync(dir, { recursive: true });
});

test('detectFramework: returns null for unknown project', () => {
  const dir = tempDir();
  assert.equal(detectFramework(dir), null);
  rmSync(dir, { recursive: true });
});

test('detectFramework: handles malformed package.json gracefully', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), 'not valid json {{');
  assert.equal(detectFramework(dir), null);
  rmSync(dir, { recursive: true });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/deepseek-tests.test.js`
Expected: Error — `Cannot find module '../scripts/deepseek-tests.js'`

- [ ] **Step 3: Create `scripts/deepseek-tests.js`**

> **Important:** This file exports `detectFramework` for testing AND has top-level execution logic. The `isMain` guard prevents the execution block from running when the file is imported by tests.

```javascript
import { parseArgs, resolveProvider, resolveModel, resolveApiKey, resolveEndpoint, streamChat } from './deepseek-core.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function detectFramework(cwd) {
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.vitest)  return 'vitest';
      if (deps.jest)    return 'jest';
      if (deps.mocha)   return 'mocha';
      if (deps.jasmine) return 'jasmine';
    } catch {}
  }
  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'pytest.ini'))) return 'pytest';
  if (existsSync(join(cwd, 'go.mod'))) return 'go test';
  return null;
}

// Only execute when run directly, not when imported by tests
const isMain = process.argv[1] === new URL(import.meta.url).pathname;

if (isMain) {
  const rawArgs = process.argv.slice(2);
  let frameworkOverride = null;
  const filteredArgs = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === '--framework') { frameworkOverride = rawArgs[++i]; }
    else filteredArgs.push(rawArgs[i]);
  }

  const args = parseArgs(filteredArgs);

  if (!args.prompt) {
    console.error('Usage: deepseek-tests.js [--model <name>] [--framework <name>] <source-file>');
    process.exit(1);
  }

  const sourceFile = resolve(process.cwd(), args.prompt.trim());

  if (!existsSync(sourceFile)) {
    console.error(`File not found: ${sourceFile}`);
    process.exit(1);
  }

  const sourceContent = readFileSync(sourceFile, 'utf8');
  const framework = frameworkOverride || detectFramework(process.cwd()) || 'the appropriate testing framework for this language';

  const provider = resolveProvider();
  const model = resolveModel(args.model, provider);
  const apiKey = resolveApiKey(provider);
  const endpoint = resolveEndpoint(provider);

  const system = `You are an expert software engineer writing tests.
Generate comprehensive tests using ${framework}.
Cover: happy path, edge cases, error/exception cases, and mock all external dependencies.
Output only the complete test file content — no explanation, no preamble, just the code.`;

  const prompt = `Generate tests for this file (${args.prompt}):\n\n\`\`\`\n${sourceContent}\n\`\`\``;

  await streamChat({ model, apiKey, endpoint, system, prompt, maxTokens: args.maxTokens });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/deepseek-tests.test.js`
Expected: All 8 tests passing, 0 failing.

- [ ] **Step 5: Run the full test suite**

Run: `node --test tests/`
Expected: All 28 tests (20 core + 8 framework detection) passing.

- [ ] **Step 6: Create `commands/tests.md`**

```markdown
---
description: Generate tests for a source file — happy path, edge cases, mocks, auto-detects framework
allowed-tools: Bash
argument-hint: "[--model deepseek-chat|deepseek-reasoner] [--framework jest|vitest|pytest|mocha|go test] <source-file>"
---

Run this command and stream the output:

```bash
node "$CLAUDE_PLUGIN_DIR/scripts/deepseek-tests.js" $ARGUMENTS
```
```

- [ ] **Step 7: Commit**

```bash
git add scripts/deepseek-tests.js commands/tests.md tests/deepseek-tests.test.js
git commit -m "feat: add tests command with framework auto-detection (TDD)"
```

---

## Task 9: Script Command

**Files:**
- Create: `scripts/deepseek-script.js`
- Create: `commands/script.md`

- [ ] **Step 1: Create `scripts/deepseek-script.js`**

```javascript
import { parseArgs, resolveProvider, resolveModel, resolveApiKey, resolveEndpoint, streamChat } from './deepseek-core.js';
import { execSync } from 'node:child_process';

function getDirTree(cwd) {
  try {
    return execSync(
      `find . -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/__pycache__/*' -not -path '*/.next/*' -maxdepth 3 | sort`,
      { cwd, encoding: 'utf8' }
    );
  } catch {
    return '';
  }
}

const args = parseArgs(process.argv.slice(2));

if (!args.prompt) {
  console.error('Usage: deepseek-script.js [--model <name>] <description>');
  process.exit(1);
}

const cwd = process.cwd();
const dirTree = getDirTree(cwd);

const provider = resolveProvider();
const model = resolveModel(args.model, provider);
const apiKey = resolveApiKey(provider);
const endpoint = resolveEndpoint(provider);

const system = `You are an expert at writing shell scripts and automation tools.
Write clean, working scripts. Output ONLY the script content — no explanation, no markdown fences, no preamble.
The script must be immediately runnable as-is.`;

const prompt = `Write a script to: ${args.prompt}

Current directory structure:
\`\`\`
${dirTree}
\`\`\``;

await streamChat({ model, apiKey, endpoint, system, prompt, maxTokens: args.maxTokens });
```

- [ ] **Step 2: Verify the script runs**

Run: `DEEPSEEK_API_KEY=<your-key> node scripts/deepseek-script.js bash script to count lines of code by file extension`
Expected: A bash script streams to stdout, ready to run.

- [ ] **Step 3: Create `commands/script.md`**

```markdown
---
description: Generate a one-off script or automation using DeepSeek, with awareness of your project structure
allowed-tools: Bash
argument-hint: "[--model deepseek-chat|deepseek-reasoner] <description of what the script should do>"
---

Run this command and stream the output:

```bash
node "$CLAUDE_PLUGIN_DIR/scripts/deepseek-script.js" $ARGUMENTS
```
```

- [ ] **Step 4: Commit**

```bash
git add scripts/deepseek-script.js commands/script.md
git commit -m "feat: add script command"
```

---

## Task 10: Subagent Definition

**Files:**
- Create: `agents/deepseek-agent.md`

- [ ] **Step 1: Create `agents/deepseek-agent.md`**

```markdown
---
name: deepseek-agent
description: |
  Use this agent to delegate tasks to DeepSeek — code review, test generation,
  rescue tasks (implementing features, refactors), quick scripts, or freeform questions.
  Prefer deepseek-reasoner for hard reasoning tasks (complex refactors, architectural decisions,
  tricky edge case generation). Use deepseek-chat for everything else.
tools: ["Bash", "Glob", "Read"]
model: inherit
color: purple
---

You are a DeepSeek-powered assistant running inside Claude Code. Use the Bash tool to invoke the appropriate DeepSeek script based on the task:

- **Freeform question or explanation:** `node $CLAUDE_PLUGIN_DIR/scripts/deepseek-chat.js [--model <name>] "<prompt>"`
- **Code review:** `node $CLAUDE_PLUGIN_DIR/scripts/deepseek-review.js [--model <name>] [--base <ref>]`
- **Implement a task / rescue:** `node $CLAUDE_PLUGIN_DIR/scripts/deepseek-rescue.js [--model <name>] "<task>"`
- **Generate tests:** `node $CLAUDE_PLUGIN_DIR/scripts/deepseek-tests.js [--model <name>] [--framework <name>] <file>`
- **Write a script or automation:** `node $CLAUDE_PLUGIN_DIR/scripts/deepseek-script.js [--model <name>] "<description>"`

Pass the task description as the final argument. Use `--model deepseek-reasoner` when the task involves complex logic, difficult edge cases, or architectural decisions.

Stream all output directly to the user without modification.
```

- [ ] **Step 2: Commit**

```bash
git add agents/deepseek-agent.md
git commit -m "feat: add deepseek-agent subagent definition"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run the full test suite**

Run: `node --test tests/`
Expected: All 28 tests passing, 0 failing. Output looks like:
```
▶ parseArgs: extracts --model flag
  ✔ parseArgs: extracts --model flag (N ms)
...
ℹ tests 28
ℹ pass 28
ℹ fail 0
```

- [ ] **Step 2: Verify file layout matches spec**

Run:
```bash
find . -not -path '*/.git/*' -not -path '*/node_modules/*' | sort
```
Expected output includes:
```
./.claude-plugin/marketplace.json
./.claude-plugin/plugin.json
./agents/deepseek-agent.md
./commands/chat.md
./commands/review.md
./commands/rescue.md
./commands/script.md
./commands/tests.md
./package.json
./scripts/deepseek-chat.js
./scripts/deepseek-core.js
./scripts/deepseek-rescue.js
./scripts/deepseek-script.js
./scripts/deepseek-tests.js
./tests/deepseek-core.test.js
./tests/deepseek-tests.test.js
```

- [ ] **Step 3: End-to-end smoke test for each command**

With `DEEPSEEK_API_KEY` set, run each script directly:

```bash
# chat
node scripts/deepseek-chat.js say hi in two words

# review (requires a git repo with changes — make a scratch edit first)
echo "// test" >> scripts/deepseek-core.js
node scripts/deepseek-review.js
git checkout scripts/deepseek-core.js

# rescue
node scripts/deepseek-rescue.js write a hello world function in TypeScript

# tests
node scripts/deepseek-tests.js scripts/deepseek-core.js

# script
node scripts/deepseek-script.js bash one-liner to count js files in current directory
```

Expected: Each command streams output to stdout and exits 0.

- [ ] **Step 4: Push to GitHub**

```bash
git push -u origin main
```

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```

---

## Post-Implementation Note: `$CLAUDE_PLUGIN_DIR` Resolution

If `$CLAUDE_PLUGIN_DIR` is not set by Claude Code when commands run, update the command `.md` bodies to use:

```bash
PLUGIN_DIR=$(find ~/.claude -name "deepseek-core.js" -path "*/scripts/*" 2>/dev/null | head -1 | xargs dirname)
node "$PLUGIN_DIR/deepseek-chat.js" $ARGUMENTS
```

This is a one-line change per command file. Test by running `/deepseek:chat hello` after `/reload-plugins`.
