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
