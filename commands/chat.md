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
