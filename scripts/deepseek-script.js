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
