// tests/suggestion-box/suggestion-box.test.mjs — v1.0 — 18JUL2026
//
// The Showrunner's suggestion box: additive, boosted, still gated, and
// retired by the same covered-ledger that stops organic repeats. These tests
// pin the three promises made to the Showrunner: (1) a suggestion is added to
// the pool without deleting organic finds; (2) it is boosted above the day's
// noise; (3) it is NOT a bypass, so a suggestion already covered is dropped by
// the ledger like any other story.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gatherStories, loadSuggestions, filterCovered, loadCoveredLedger, storyId } from '../../pipeline/lib/feeds.mjs';

const SOURCES = {
  userAgent: 'test',
  rss: [{ name: 'TestFeed', url: 'https://feed.example/rss', weight: 1 }],
  hackernews: { endpoint: 'https://hn.example/search', query: 'AI', minPoints: 50, windowHours: 24, hitsPerPage: 20 },
  fallback: { provider: 'tavily', fireWhenFewerThan: 3 },
  selection: { min: 3, max: 5, quietDayThreshold: 2 },
};

// A fetchImpl that serves one organic RSS story, an empty HN, and a title
// page for any suggested URL.
function fetchImpl(url) {
  if (url.includes('/rss')) {
    return Promise.resolve({ ok: true, text: async () => `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>
      <item><title>An organic finding</title><link>https://organic.example/a</link><pubDate>${new Date().toUTCString()}</pubDate></item>
    </channel></rss>` });
  }
  if (url.includes('hn.example')) return Promise.resolve({ ok: true, json: async () => ({ hits: [] }) });
  // a suggested article page
  return Promise.resolve({ ok: true, text: async () => '<html><head><title>The Suggested Story</title></head></html>' });
}

test('a suggestion is added to the pool without deleting organic finds (additive)', async () => {
  const { stories } = await gatherStories({
    sources: SOURCES, fetchImpl, now: Date.now(),
    suggestions: [{ url: 'https://guardian.example/adversarial-clothing', note: 'the surveillance-fashion piece' }],
  });
  const titles = stories.map((s) => s.title);
  assert.ok(titles.includes('An organic finding'), 'organic story survives');
  assert.ok(titles.includes('The Suggested Story'), 'suggested story added, title fetched from its page');
});

test('a suggestion is boosted above the day\'s noise but still just a candidate', async () => {
  const { stories } = await gatherStories({
    sources: SOURCES, fetchImpl, now: Date.now(),
    suggestions: [{ url: 'https://guardian.example/adversarial-clothing' }],
  });
  assert.equal(stories[0].suggested, true, 'the suggestion sorts to the top of the candidate slice');
  assert.ok(stories[0].score >= 1000, 'the boost is applied');
  // ...but it is one story among several; the organic pool is intact beneath it.
  assert.ok(stories.length >= 2);
});

test('a suggestion that also surfaced organically is flagged in place, not duplicated', async () => {
  // Serve the SAME url via RSS and as a suggestion.
  const dupFetch = (url) => {
    if (url.includes('/rss')) return Promise.resolve({ ok: true, text: async () => `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>
      <item><title>Both organic and suggested</title><link>https://both.example/x</link><pubDate>${new Date().toUTCString()}</pubDate></item>
    </channel></rss>` });
    if (url.includes('hn.example')) return Promise.resolve({ ok: true, json: async () => ({ hits: [] }) });
    return Promise.resolve({ ok: true, text: async () => '<title>x</title>' });
  };
  const { stories } = await gatherStories({
    sources: SOURCES, fetchImpl: dupFetch, now: Date.now(),
    suggestions: [{ url: 'https://both.example/x', note: 'please cover this' }],
  });
  const matches = stories.filter((s) => s.url === 'https://both.example/x');
  assert.equal(matches.length, 1, 'no duplicate');
  assert.equal(matches[0].suggested, true, 'the organic story is flagged as suggested');
  assert.ok(matches[0].sources.includes('Showrunner') && matches[0].sources.includes('TestFeed'), 'both sources credited');
});

test('the boost is not a bypass: a published suggestion is retired by the ledger', () => {
  // Simulate the day after: the suggestion was published, so its storyId/url are in the archive.
  const dir = mkdtempSync(join(tmpdir(), 'sug-ledger-'));
  const specola = join(dir, 'specola');
  mkdirSync(specola);
  const url = 'https://guardian.example/adversarial-clothing';
  writeFileSync(join(specola, '2026-07-18-adversarial.md'), `---
title: 'Adversarial clothing'
date: '2026-07-18'
storyId: ${storyId(url)}
citations: [{ title: 'x', url: '${url}', source: 'The Guardian' }]
stamps: {}
---
Body.
`);
  const ledger = loadCoveredLedger(specola);
  const stillSuggested = [{ storyId: storyId(url), url, title: 'Adversarial clothing', suggested: true }];
  const { fresh, covered } = filterCovered(stillSuggested, ledger);
  assert.equal(covered.length, 1, 'a suggestion once published is retired like any other story');
  assert.equal(fresh.length, 0);
});

test('loadSuggestions tolerates a missing or malformed box', () => {
  assert.deepEqual(loadSuggestions(join(tmpdir(), 'nope-' + Date.now() + '.json')), []);
});
