// tests/nuncio-dedupe/nuncio-dedupe.test.mjs — v1.0 — 17JUL2026
//
// The day the Specola reported the same news twice. On 16-17JUL2026 the
// Nuncio re-picked "How I tricked Claude..." (same URL, same storyId) and
// "Inkling..." (same story, DIFFERENT URL, different storyId) on consecutive
// days, and the Chronicle went hungry for fresh material. The fix: the
// published archive is the ledger, and three nets catch the returning fish —
// id, canonical URL, normalized title. This suite replays the real incident.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCoveredLedger, filterCovered, storyId, normalizeTitle } from '../../pipeline/lib/feeds.mjs';

function makeArchive() {
  const dir = mkdtempSync(join(tmpdir(), 'specola-ledger-'));
  const specola = join(dir, 'specola');
  mkdirSync(specola);
  // Day one, as actually published (storyIds are the real incident's).
  writeFileSync(join(specola, '2026-07-16-how-i-tricked-claude.md'), `---
title: 'How I tricked Claude into leaking your deepest, darkest secrets'
date: '2026-07-16'
storyId: ${storyId('https://example-security.blog/claude-leak')}
citations:
  - { title: 'How I tricked Claude', url: 'https://example-security.blog/claude-leak', source: 'Example Blog' }
stamps: { nihilObstat: '2026-07-16', imprimatur: '2026-07-16' }
---
Body.
`);
  writeFileSync(join(specola, '2026-07-16-inkling.md'), `---
title: 'Inkling: Our Open-Weights Model'
date: '2026-07-16'
storyId: ${storyId('https://inkling-lab.example/announcement')}
citations:
  - { title: 'Inkling announcement', url: 'https://inkling-lab.example/announcement', source: 'Inkling' }
stamps: { nihilObstat: '2026-07-16', imprimatur: '2026-07-16' }
---
Body.
`);
  return specola;
}

test('same URL re-picked on day two is excluded (the storyId net)', () => {
  const ledger = loadCoveredLedger(makeArchive());
  const dayTwo = [
    { storyId: storyId('https://example-security.blog/claude-leak'), url: 'https://example-security.blog/claude-leak', title: 'How I tricked Claude into leaking your deepest, darkest secrets' },
    { storyId: storyId('https://fresh.example/new-story'), url: 'https://fresh.example/new-story', title: 'A genuinely new development' },
  ];
  const { fresh, covered } = filterCovered(dayTwo, ledger);
  assert.equal(covered.length, 1);
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].title, 'A genuinely new development');
});

test('same story under a different URL is excluded (the title net — the Inkling case)', () => {
  const ledger = loadCoveredLedger(makeArchive());
  const dayTwo = [
    // Different host, different id, lowercase title — the real day-two disguise.
    { storyId: storyId('https://news-aggregator.example/inkling-mirror'), url: 'https://news-aggregator.example/inkling-mirror', title: 'Inkling: Our open-weights model' },
  ];
  const { fresh, covered } = filterCovered(dayTwo, ledger);
  assert.equal(covered.length, 1, 'the returning fish is caught by its face, not its address');
  assert.equal(fresh.length, 0);
});

test('tracking-param and www disguises are excluded (the canonical-URL net)', () => {
  const ledger = loadCoveredLedger(makeArchive());
  const dayTwo = [
    { storyId: 'differently-hashed', url: 'https://www.example-security.blog/claude-leak?utm_source=feed', title: 'Completely retitled by an aggregator' },
  ];
  const { covered } = filterCovered(dayTwo, ledger);
  assert.equal(covered.length, 1);
});

test('an empty archive covers nothing (a young See)', () => {
  const ledger = loadCoveredLedger(join(tmpdir(), 'does-not-exist-' + Date.now()));
  const { fresh, covered } = filterCovered([{ storyId: 'x', url: 'https://a.example/b', title: 'T' }], ledger);
  assert.equal(covered.length, 0);
  assert.equal(fresh.length, 1);
});

test('normalizeTitle flattens case and punctuation, not meaning', () => {
  assert.equal(normalizeTitle('Inkling: Our Open-Weights Model'), normalizeTitle('inkling — our open weights model!'));
  assert.notEqual(normalizeTitle('GPT-5.6 launches'), normalizeTitle('GPT-5.7 launches'));
});
