import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectFramework } from '../scripts/deepseek-tests.js';

function tempDir() {
  const dir = join(tmpdir(), `ds-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir);
  return dir;
}

test('detectFramework: detects vitest (takes priority over jest)', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '^1.0.0', jest: '^29.0.0' } }));
  assert.equal(detectFramework(dir), 'vitest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects jest', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { jest: '^29.0.0' } }));
  assert.equal(detectFramework(dir), 'jest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects mocha', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { mocha: '^10.0.0' } }));
  assert.equal(detectFramework(dir), 'mocha');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects pytest from pyproject.toml', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'pyproject.toml'), '[tool.pytest.ini_options]\n');
  assert.equal(detectFramework(dir), 'pytest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects pytest from pytest.ini', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'pytest.ini'), '[pytest]\n');
  assert.equal(detectFramework(dir), 'pytest');
  rmSync(dir, { recursive: true });
});

test('detectFramework: detects go test from go.mod', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'go.mod'), 'module myapp\n\ngo 1.21\n');
  assert.equal(detectFramework(dir), 'go test');
  rmSync(dir, { recursive: true });
});

test('detectFramework: returns null for unknown project', () => {
  const dir = tempDir();
  assert.equal(detectFramework(dir), null);
  rmSync(dir, { recursive: true });
});

test('detectFramework: handles malformed package.json gracefully', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'package.json'), 'not valid json {{');
  assert.equal(detectFramework(dir), null);
  rmSync(dir, { recursive: true });
});
