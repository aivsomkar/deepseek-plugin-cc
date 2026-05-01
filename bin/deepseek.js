#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts');

const SCRIPTS = {
  chat:   'deepseek-chat.js',
  review: 'deepseek-review.js',
  rescue: 'deepseek-rescue.js',
  tests:  'deepseek-tests.js',
  script: 'deepseek-script.js',
};

const subcommand = process.argv[2];

if (!subcommand || !SCRIPTS[subcommand]) {
  console.error(`Usage: deepseek <command> [options] [args]

Commands:
  chat    [--model <name>] <question or task>
  review  [--model <name>] [--base <ref>]
  rescue  [--model <name>] <task description>
  tests   [--model <name>] [--framework <name>] <source-file>
  script  [--model <name>] <description>

Models:
  deepseek-chat      Fast, cheap — everyday use (default)
  deepseek-reasoner  Stronger reasoning — hard problems
  deepseek-v4        Latest model

Provider (set via env):
  DEEPSEEK_PROVIDER=deepseek     Use DeepSeek API directly (default)
  DEEPSEEK_PROVIDER=openrouter   Use OpenRouter`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [join(scriptDir, SCRIPTS[subcommand]), ...process.argv.slice(3)],
  { stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 1);
