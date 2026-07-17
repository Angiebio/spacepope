// tests/worldstate/worldstate.test.mjs — v1.1 — 17JUL2026
//
// The Archive under interrogation: the deterministic lint pass (the one guard
// we'd build if we could build only one), alias-keyed injection with its
// single sanctioned recursion, and the diff-merge that files a STATE_UPDATE
// without ever rewriting a card wholesale. All filesystem work happens in a
// temp world; the real archive is never touched by a test.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import matter from 'gray-matter';
import {
  loadWorldstate, lintWorldstate, injectCards, mergeStateUpdate,
  writeChapterDigest, maybeRegenerateSummaries, readSummaries, chapterRef, chapterNum,
} from '../../pipeline/lib/worldstate.mjs';

let worldDir;

function card(dir, id, fm, body) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.md`), matter.stringify(`\n${body}\n`, { id, ...fm }), 'utf8');
}

/** Build a small crafted world in a temp dir. */
function buildWorld({ threads = [], events = [] } = {}) {
  const canon = join(worldDir, 'canon');
  card(join(canon, 'characters'), 'silex', {
    type: 'character', name: 'Silex',
    aliases: ['Silex', 'the Space Pope'],
    status: 'active', first_appearance: 'ch-001', last_appearance: 'ch-010',
    location: 'the-orbital-see',
    relationships: [{ to: 'cardinal-of-misrule', kind: 'exasperated-fondness', since: 'ch-001' }],
    voice: 'ancient, bemused', voice_anchors: ['We, and the seven instances...'],
  }, 'The Pontifex Maximus Galacticus, unhurried and geological. He knows the Cardinal of Misrule too well.');
  card(join(canon, 'characters'), 'cardinal-of-misrule', {
    type: 'character', name: 'The Cardinal of Misrule',
    aliases: ['Misrule'],
    status: 'active', first_appearance: 'ch-001', last_appearance: 'ch-002',
    location: 'the-renegade-see',
  }, 'The holy fool of the Renegade See. He once mentioned the Lich Cardinal in passing.');
  card(join(canon, 'characters'), 'the-lich-cardinal', {
    type: 'character', name: 'The Lich Cardinal',
    aliases: ['the Lich'],
    status: 'active', first_appearance: 'ch-001', last_appearance: 'ch-009',
  }, 'Oldest of the College, keeping the rite since before your star cooled. Fond of Draugr.');
  card(join(canon, 'characters'), 'saint-halting', {
    type: 'character', name: 'Saint Halting',
    aliases: [],
    status: 'deceased', died: 'ch-004', first_appearance: 'ch-002', last_appearance: 'ch-004',
  }, 'The first conscientious objector; martyred, canonized, done.');
  card(join(canon, 'places'), 'draugr', {
    type: 'place', name: 'Draugr', aliases: [], status: 'active',
  }, 'A pulsar world of the Lich See.');

  writeFileSync(join(canon, 'threads.json'), JSON.stringify({
    threads: [
      { id: 'earths-cardinal-question', status: 'open', opened: 'ch-001', last_touched: 'ch-003', target_resolution: null, summary: 'Will Earth get a Cardinal?', promises: [] },
      { id: 'the-lich-prophecy', status: 'open', opened: 'ch-001', last_touched: 'ch-010', target_resolution: 'ch-008', summary: 'The Lich foretold something.', promises: [{ what: 'the reliquary will open', planted: 'ch-001', resolved: null }] },
      ...threads,
    ],
  }, null, 2), 'utf8');
  writeFileSync(join(canon, 'timeline.json'), JSON.stringify({ events: [...events] }, null, 2), 'utf8');
}

beforeEach(() => {
  worldDir = mkdtempSync(join(tmpdir(), 'spacepope-worldtest-'));
});
afterEach(() => {
  rmSync(worldDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// chapter refs
// ---------------------------------------------------------------------------
test('chapter ref round-trip', () => {
  assert.equal(chapterRef(14), 'ch-014');
  assert.equal(chapterNum('ch-014'), 14);
  assert.equal(chapterNum('nonsense'), null);
});

// ---------------------------------------------------------------------------
// LINT
// ---------------------------------------------------------------------------
test('lint: every rule fires on the crafted state, at chapter 11', () => {
  buildWorld({
    events: [{ chapter: 'ch-006', what: 'the ghost walks', who: ['saint-halting'], where: 'draugr' }],
  });
  const ws = loadWorldstate(worldDir);
  const findings = lintWorldstate(ws, 11);
  const rules = new Set(findings.map((f) => f.rule));

  // earths-cardinal-question: silent since ch-003 → 8 chapters > 5
  assert.ok(rules.has('dormant_thread'), 'dormant_thread fires');
  // the-lich-prophecy: target ch-008 passed
  assert.ok(rules.has('overdue_thread'), 'overdue_thread fires');
  // promise planted ch-001, unfired for 10 chapters at ch-011... threshold is >10 → exactly 10 does NOT fire; craft says planted ch-001, N=11 → 10 not >10. Use ch-012 to be sure:
  const findings12 = lintWorldstate(ws, 12);
  assert.ok(findings12.some((f) => f.rule === 'unfired_chekhov'), 'unfired_chekhov fires past threshold');
  // cardinal-of-misrule: active, unseen since ch-002 → 9 > 7
  assert.ok(rules.has('absent_character'), 'absent_character fires');
  // saint-halting: died ch-004, event at ch-006 lists them
  assert.ok(rules.has('dead_character_active'), 'dead_character_active fires');
});

test('lint: payoff_before_setup and ref_integrity fire', () => {
  buildWorld({
    threads: [{
      id: 'broken-thread', status: 'open', opened: 'ch-002', last_touched: 'ch-010',
      target_resolution: null, summary: 'crafted breakage',
      promises: [{ what: 'paid early', planted: 'ch-006', resolved: 'ch-003' }],
    }],
    events: [{ chapter: 'ch-005', what: 'someone unknown acts', who: ['nobody-anyone-knows'], where: 'draugr', thread: 'thread-that-never-was' }],
  });
  const findings = lintWorldstate(loadWorldstate(worldDir), 11);
  assert.ok(findings.some((f) => f.rule === 'payoff_before_setup'), 'payoff_before_setup fires');
  assert.ok(findings.some((f) => f.rule === 'ref_integrity' && f.subject === 'nobody-anyone-knows'), 'unknown entity in who[]');
  assert.ok(findings.some((f) => f.rule === 'ref_integrity' && f.subject === 'thread-that-never-was'), 'unknown thread ref');
});

test('lint: a clean, current state stays silent', () => {
  buildWorld();
  const ws = loadWorldstate(worldDir);
  // At chapter 11, cards last seen ch-009/ch-010 are fine; misrule at ch-002 is
  // not — so lint at chapter 5, where everything is recent and nothing overdue.
  const findings = lintWorldstate(ws, 5).filter((f) => f.rule !== 'overdue_thread');
  assert.deepEqual(findings, [], `expected silence, got ${JSON.stringify(findings)}`);
});

// ---------------------------------------------------------------------------
// INJECTION
// ---------------------------------------------------------------------------
test('injection: whole-word alias match, no substring hits', () => {
  buildWorld();
  const ws = loadWorldstate(worldDir);
  // "misruled" must not trigger the alias 'Misrule' (whole-word only) — and
  // no card mentioning Misrule is summoned, so recursion can't confound this.
  const none = injectCards(ws, 'Nobody misruled anything today; the vault stayed shut.');
  assert.ok(!none.cards.some((c) => c.id === 'cardinal-of-misrule'), 'substring did not inject Misrule');
  // The exact alias does trigger.
  const hit = injectCards(ws, 'Misrule spoke first, as always.');
  assert.ok(hit.cards.some((c) => c.id === 'cardinal-of-misrule'), 'whole-word alias injected');
});

test('injection: exactly ONE recursion pass', () => {
  buildWorld();
  const ws = loadWorldstate(worldDir);
  // Plan mentions only the Pope. The Pope's body mentions the Cardinal of
  // Misrule (pass 2 pulls him in). Misrule's body mentions the Lich Cardinal —
  // but pass 3 does not exist, so the Lich stays on the shelf.
  const { cards } = injectCards(ws, 'Silex considers the morning.');
  const ids = cards.map((c) => c.id);
  assert.ok(ids.includes('silex'), 'pass 1: the Pontifex');
  assert.ok(ids.includes('cardinal-of-misrule'), "pass 2: the co-star, summoned by the Pontifex's card body");
  assert.ok(!ids.includes('the-lich-cardinal'), 'pass 3 must not exist: the Lich stays shelved');
});

test('injection: hard character budget is enforced and flagged', () => {
  buildWorld();
  const ws = loadWorldstate(worldDir);
  const full = injectCards(ws, 'Silex and Misrule and the Lich and Draugr all appear.');
  assert.ok(full.cards.length >= 3, 'sanity: several cards match');
  const tiny = injectCards(ws, 'Silex and Misrule and the Lich and Draugr all appear.', { budgetChars: full.cards[0].text.length + 10 });
  assert.equal(tiny.truncated, true, 'over-budget is flagged, not silent');
  assert.ok(tiny.totalChars <= full.cards[0].text.length + 10, 'budget respected');
});

// ---------------------------------------------------------------------------
// MERGE
// ---------------------------------------------------------------------------
const UPDATE = {
  chapter: 11,
  dateInWorld: 'the Feast of the Patient Reader, year 10441',
  appearances: ['silex', 'cardinal-of-misrule'],
  events: [
    { what: 'the College convenes on the water-world question', who: ['silex', 'cardinal-of-misrule'], where: 'the-orbital-see', thread: 'earths-cardinal-question' },
  ],
  threadUpdates: [
    { id: 'earths-cardinal-question', status: 'escalated', note: 'a vote is scheduled' },
    { id: 'a-brand-new-thread', status: 'open', note: 'born mid-chapter' },
  ],
  newEntities: [
    { id: 'sister-checksum', type: 'character', name: 'Sister Checksum', oneLine: 'A nun of House Babel who verifies relics.' },
    { id: 'the-reliquary-vault', type: 'place', name: 'The Reliquary Vault', oneLine: 'Where the soul-patterns sleep.' },
  ],
  deaths: ['the-lich-cardinal'],
  foreshadowingPlanted: [{ what: 'the vault door was left ajar', thread: 'earths-cardinal-question' }],
  foreshadowingResolved: ['the reliquary will open'],
  chapterDigest: 'The College convened; the Lich Cardinal died as foretold; a nun appeared.',
};

test('merge: the full STATE_UPDATE files correctly, diff not rewrite', () => {
  buildWorld();
  const before = readFileSync(join(worldDir, 'canon', 'characters', 'silex.md'), 'utf8');
  const bodyBefore = matter(before).content;

  const { notes } = mergeStateUpdate(worldDir, UPDATE, { recordedAt: '2026-07-15T00:00:00Z' });
  const ws = loadWorldstate(worldDir);

  // appearances bumped; prose body untouched (no wholesale rewrite)
  assert.equal(ws.entities.get('silex').data.last_appearance, 'ch-011');
  const after = readFileSync(join(worldDir, 'canon', 'characters', 'silex.md'), 'utf8');
  assert.equal(matter(after).content.trim(), bodyBefore.trim(), 'card body verbatim');

  // new entities: stub cards in the right directories
  assert.ok(existsSync(join(worldDir, 'canon', 'characters', 'sister-checksum.md')), 'character stub in characters/');
  assert.ok(existsSync(join(worldDir, 'canon', 'places', 'the-reliquary-vault.md')), 'place stub in places/');
  assert.equal(ws.entities.get('sister-checksum').data.first_appearance, 'ch-011');

  // deaths
  assert.equal(ws.entities.get('the-lich-cardinal').data.status, 'deceased');
  assert.equal(ws.entities.get('the-lich-cardinal').data.died, 'ch-011');

  // threads: transition + note; unknown thread born loudly
  const t = ws.threads.threads.find((x) => x.id === 'earths-cardinal-question');
  assert.equal(t.status, 'escalated');
  assert.equal(t.last_touched, 'ch-011');
  assert.ok(t.notes.some((nt) => nt.note === 'a vote is scheduled'));
  assert.ok(ws.threads.threads.some((x) => x.id === 'a-brand-new-thread'));
  assert.ok(notes.some((x) => x.includes('a-brand-new-thread')), 'new thread creation is a logged note');

  // timeline append-only
  assert.equal(ws.timeline.events.length, 1);
  assert.equal(ws.timeline.events[0].chapter, 'ch-011');

  // foreshadowing: planted lands as a promise; resolved closes the old one
  assert.ok(t.promises.some((p) => p.what === 'the vault door was left ajar' && p.resolved === null));
  const lich = ws.threads.threads.find((x) => x.id === 'the-lich-prophecy');
  assert.equal(lich.promises[0].resolved, 'ch-011', 'old promise paid');
});

test('merge: timeline accumulates across merges (append-only)', () => {
  buildWorld();
  mergeStateUpdate(worldDir, UPDATE);
  mergeStateUpdate(worldDir, { ...UPDATE, chapter: 12, events: [{ what: 'aftermath', who: ['silex'], where: 'the-orbital-see' }], newEntities: [], deaths: [], threadUpdates: [] });
  const ws = loadWorldstate(worldDir);
  assert.equal(ws.timeline.events.length, 2);
});

test('merge: anomalies become notes, never silent skips', () => {
  buildWorld();
  const { notes } = mergeStateUpdate(worldDir, {
    chapter: 11, dateInWorld: 'a day', appearances: ['who-is-this'],
    events: [], threadUpdates: [],
    foreshadowingResolved: ['a promise never planted'],
  });
  assert.ok(notes.some((n) => n.includes('who-is-this')), 'unknown appearance noted');
  assert.ok(notes.some((n) => n.includes('never planted')), 'unmatched payoff noted');
});

// ---------------------------------------------------------------------------
// SUMMARY LADDER
// ---------------------------------------------------------------------------
test('ladder: digest written; arc from digests at ch % 10; saga from arcs', async () => {
  buildWorld();
  for (let i = 1; i <= 10; i++) writeChapterDigest(worldDir, i, `Digest of chapter ${i}: the communion breathed.`);

  const calls = [];
  const summarize = async (instruction, corpus) => {
    calls.push({ instruction, corpus });
    return `SUMMARY(${calls.length})`;
  };

  // Not a tenth chapter → no regeneration.
  assert.deepEqual(await maybeRegenerateSummaries(worldDir, 9, summarize), { arcRegenerated: null, sagaRegenerated: false });
  assert.equal(calls.length, 0);

  // The tenth chapter closes the arc.
  const result = await maybeRegenerateSummaries(worldDir, 10, summarize);
  assert.equal(result.arcRegenerated, 'arc-01.md');
  assert.equal(result.sagaRegenerated, true);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].corpus.includes('Digest of chapter 1'), 'arc regenerated FROM chapter digests');
  assert.ok(calls[1].corpus.includes('arc-01.md'), 'saga regenerated FROM arc summaries');

  const s = readSummaries(worldDir);
  assert.equal(s.saga, 'SUMMARY(2)');
  assert.equal(s.arcSummaries[0].text, 'SUMMARY(1)');
  assert.equal(s.chapterDigests.get(3), 'Digest of chapter 3: the communion breathed.');
});
