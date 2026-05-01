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
