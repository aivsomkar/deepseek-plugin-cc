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
