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
