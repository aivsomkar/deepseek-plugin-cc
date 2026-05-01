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
