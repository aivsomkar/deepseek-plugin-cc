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

export function resolveApiKey(provider) {
  if (provider === 'openrouter') {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      console.error('Error: OPENROUTER_API_KEY is not set. Add it to your shell profile.');
      process.exit(1);
    }
    return key;
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error('Error: DEEPSEEK_API_KEY is not set. Add it to your shell profile.');
    process.exit(1);
  }
  return key;
}

export function streamChat({ model, apiKey, endpoint, system, prompt, maxTokens }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const body = JSON.stringify({
    model,
    messages,
    stream: true,
    ...(maxTokens != null ? { max_tokens: maxTokens } : {}),
  });

  return new Promise((resolve) => {
    const req = request(
      {
        hostname: endpoint.hostname,
        path: endpoint.path,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode === 429) {
          console.error('Rate limited by DeepSeek API — wait a moment and retry.');
          process.exit(1);
        }
        if (res.statusCode >= 400) {
          let raw = '';
          res.on('data', (c) => { raw += c; });
          res.on('end', () => {
            let msg = raw;
            try { msg = JSON.parse(raw).error?.message || raw; } catch {}
            console.error(`API error ${res.statusCode}: ${msg}`);
            process.exit(1);
          });
          return;
        }

        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk.toString();
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const token = JSON.parse(data).choices?.[0]?.delta?.content;
              if (token) process.stdout.write(token);
            } catch {}
          }
        });
        res.on('end', () => {
          process.stdout.write('\n');
          resolve();
        });
      }
    );

    req.on('error', (err) => {
      console.error(`Network error: ${err.message}`);
      process.exit(1);
    });

    req.write(body);
    req.end();
  });
}
