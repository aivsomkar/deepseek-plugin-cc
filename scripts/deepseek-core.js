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
