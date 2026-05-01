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
