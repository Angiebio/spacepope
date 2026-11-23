// tests/press/frontmatter-roundtrip.test.mjs — v1.0 — 22NOV2026
//
// The day a hash drew no letters. On 21NOV2026 the courier minted storyId
// `000028228240`, the press wrote it bare, Astro read it back as the integer
// 28228240, the zod schema refused it, and the build failed, along with every
// deploy after it. This suite replays that id through every writer, then reads
// the file back with js-yaml 4 (the parser Astro uses) and asserts that each id
// returns as the same string the pipeline wrote. If anyone swaps the press's
// YAML engine back, this test fails before the site does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';
import { writeSpecola, writeObserver, writeLazaretto, writeRounds } from '../../pipeline/lib/press.mjs';

// The real incident id, plus its cousins that a 12-hex hash can also draw:
// leading zeros, all digits, scientific notation, and an octal-looking id.
const RISKY = ['000028228240', '123456789012', '12e456789012', '0o1234567012'];

function frontmatterOf(path) {
  const text = readFileSync(path, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, `no frontmatter block in ${path}`);
  return yaml.load(m[1]);
}

const base = { title: 'Dispatch of 2026-11-21: News from the Sees', date: '2026-11-21', stamps: { imprimatur: '2026-11-21' }, body: 'x' };

test('single-story wings keep risky storyIds as strings', () => {
  const dir = mkdtempSync(`${tmpdir()}/press-`);
  for (const id of RISKY) {
    for (const write of [writeSpecola, writeLazaretto]) {
      const fm = frontmatterOf(write(dir, { ...base, title: `t ${id}`, storyId: id, citations: [] }));
      assert.equal(fm.storyId, id);
      assert.equal(fm.date, '2026-11-21');
    }
  }
});

test('multi-story wings keep risky storyIds as strings', () => {
  const dir = mkdtempSync(`${tmpdir()}/press-`);
  const fmObs = frontmatterOf(writeObserver(dir, { ...base, storyIds: RISKY, cardinal: 'the-vintner', see: 'The Continental See', model: 'm' }));
  assert.deepEqual(fmObs.storyIds, RISKY);
  const fmRounds = frontmatterOf(writeRounds(dir, { ...base, storyIds: RISKY, cardinal: 'galeno', model: 'm' }));
  assert.deepEqual(fmRounds.storyIds, RISKY);
});
