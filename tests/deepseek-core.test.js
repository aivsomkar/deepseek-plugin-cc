import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../scripts/deepseek-core.js';

test('parseArgs: extracts --model flag', () => {
  const result = parseArgs(['--model', 'deepseek-reasoner', 'hello world']);
  assert.equal(result.model, 'deepseek-reasoner');
  assert.equal(result.prompt, 'hello world');
});

test('parseArgs: extracts --system flag', () => {
  const result = parseArgs(['--system', 'you are helpful', 'my question']);
  assert.equal(result.system, 'you are helpful');
  assert.equal(result.prompt, 'my question');
});

test('parseArgs: extracts --max-tokens flag', () => {
  const result = parseArgs(['--max-tokens', '1000', 'prompt text']);
  assert.equal(result.maxTokens, 1000);
  assert.equal(result.prompt, 'prompt text');
});

test('parseArgs: joins multiple prompt words', () => {
  const result = parseArgs(['explain', 'this', 'to', 'me']);
  assert.equal(result.prompt, 'explain this to me');
});

test('parseArgs: returns nulls for missing flags', () => {
  const result = parseArgs(['just a prompt']);
  assert.equal(result.model, null);
  assert.equal(result.system, null);
  assert.equal(result.maxTokens, null);
});

test('parseArgs: empty argv gives empty prompt', () => {
  const result = parseArgs([]);
  assert.equal(result.prompt, '');
  assert.equal(result.model, null);
});

import { resolveProvider, resolveModel, resolveEndpoint } from '../scripts/deepseek-core.js';

test('resolveProvider: defaults to deepseek', () => {
  delete process.env.DEEPSEEK_PROVIDER;
  assert.equal(resolveProvider(), 'deepseek');
});

test('resolveProvider: reads env var', () => {
  process.env.DEEPSEEK_PROVIDER = 'openrouter';
  assert.equal(resolveProvider(), 'openrouter');
  delete process.env.DEEPSEEK_PROVIDER;
});

test('resolveModel: deepseek-chat on deepseek provider', () => {
  assert.equal(resolveModel('deepseek-chat', 'deepseek'), 'deepseek-chat');
});

test('resolveModel: deepseek-chat on openrouter provider', () => {
  assert.equal(resolveModel('deepseek-chat', 'openrouter'), 'deepseek/deepseek-chat');
});

test('resolveModel: deepseek-reasoner maps to r1 on openrouter', () => {
  assert.equal(resolveModel('deepseek-reasoner', 'openrouter'), 'deepseek/deepseek-r1');
});

test('resolveModel: deepseek-v4 on deepseek provider', () => {
  assert.equal(resolveModel('deepseek-v4', 'deepseek'), 'deepseek-v4');
});

test('resolveModel: deepseek-v4 on openrouter provider', () => {
  assert.equal(resolveModel('deepseek-v4', 'openrouter'), 'deepseek/deepseek-v4');
});

test('resolveModel: unknown model passes through on deepseek', () => {
  assert.equal(resolveModel('deepseek-v5', 'deepseek'), 'deepseek-v5');
});

test('resolveModel: unknown model gets deepseek/ prefix on openrouter', () => {
  assert.equal(resolveModel('deepseek-v5', 'openrouter'), 'deepseek/deepseek-v5');
});

test('resolveModel: uses DEEPSEEK_MODEL env var when no flag', () => {
  process.env.DEEPSEEK_MODEL = 'deepseek-reasoner';
  assert.equal(resolveModel(null, 'deepseek'), 'deepseek-reasoner');
  delete process.env.DEEPSEEK_MODEL;
});

test('resolveModel: --model flag overrides env var', () => {
  process.env.DEEPSEEK_MODEL = 'deepseek-reasoner';
  assert.equal(resolveModel('deepseek-chat', 'deepseek'), 'deepseek-chat');
  delete process.env.DEEPSEEK_MODEL;
});

test('resolveModel: falls back to deepseek-chat when nothing set', () => {
  delete process.env.DEEPSEEK_MODEL;
  assert.equal(resolveModel(null, 'deepseek'), 'deepseek-chat');
});

test('resolveEndpoint: deepseek provider', () => {
  const ep = resolveEndpoint('deepseek');
  assert.equal(ep.hostname, 'api.deepseek.com');
  assert.equal(ep.path, '/chat/completions');
});

test('resolveEndpoint: openrouter provider', () => {
  const ep = resolveEndpoint('openrouter');
  assert.equal(ep.hostname, 'openrouter.ai');
  assert.equal(ep.path, '/api/v1/chat/completions');
});
