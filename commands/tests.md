---
description: Generate tests for a source file — happy path, edge cases, mocks, auto-detects framework
allowed-tools: Bash
argument-hint: "[--model deepseek-chat|deepseek-reasoner] [--framework jest|vitest|pytest|mocha|go test] <source-file>"
---

Run this command and stream the output:

```bash
node "$CLAUDE_PLUGIN_DIR/scripts/deepseek-tests.js" $ARGUMENTS
```
