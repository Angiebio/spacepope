// tests/golden-medtech/golden-medtech.test.mjs — v1.0 — 18JUL2026
//
// THE BODY-BEAT GOLDEN RUN: the same organism, pointed at the Lazaretto
// (--beat=medtech). Canned medtech news in, canned minds answering, the real
// deterministic spine between. This file is the tripwire for the quarantine
// doctrine (canon §5b): if the body-beat ever starts a Chronicle, seats a
// bidding College, writes to the sky-beat's wings, or collides with the sky-
// beat's Acta, it goes red before any deploy does. It also re-asserts, in the
// same sandbox, that the sky-beat is UNCHANGED by the beat machinery.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import matter from 'gray-matter';
import { buildContext, runPipeline } from '../../pipeline/run.mjs';
import { createFixtureClient } from '../../pipeline/lib/openrouter.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'golden', 'fixtures');
const REPO = join(HERE, '..', '..');
const DATE = '2026-07-18';

const loadJson = (f) => JSON.parse(readFileSync(join(FIXTURES, f), 'utf8'));
const medNews = () => loadJson('news.medtech.json');
const medLlm = () => loadJson('llm-responses.medtech.json');
const aiNews = () => loadJson('news.json');
const aiLlm = () => loadJson('llm-responses.json');

let base;
let env;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'spacepope-medtech-'));
  env = {
    CONTENT_DIR: join(base, 'content'),
    WORLD_DIR: join(base, 'world'),
    RUNS_DIR: join(base, 'runs'),
    ASSETS_DIR: join(base, 'assets'),
  };
});
afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

function medCtx({ llm = medLlm(), news = medNews() } = {}) {
  return buildContext({
    date: DATE, beat: 'medtech', fixtures: true, env,
    client: createFixtureClient(llm),
    fixtureData: { news, llm },
  });
}
function aiCtx({ llm = aiLlm(), news = aiNews() } = {}) {
  return buildContext({
    date: DATE, beat: 'ai', fixtures: true, env,
    client: createFixtureClient(llm),
    fixtureData: { news, llm },
  });
}

// ---------------------------------------------------------------------------
test('body-beat golden run: Lazaretto bulletins + a Galeno Rounds, no Chronicle, no College', async () => {
  const result = await runPipeline(medCtx());
  assert.equal(result.status, 'published');

  // ---- Lazaretto: three factual bulletins, in the body-beat wing ------------
  const lazDir = join(env.CONTENT_DIR, 'lazaretto');
  const lazFiles = readdirSync(lazDir);
  assert.equal(lazFiles.length, 3, 'three Lazaretto bulletins');
  for (const f of lazFiles) {
    assert.match(f, /^2026-07-18-[a-z0-9-]+\.md$/, 'YYYY-MM-DD-slug.md convention');
    const { data, content } = matter(readFileSync(join(lazDir, f), 'utf8'));
    assert.equal(typeof data.title, 'string');
    assert.match(data.storyId, /^s-/);
    assert.ok(Array.isArray(data.citations) && data.citations.length >= 1, 'citations.min(1)');
    assert.equal(data.stamps.nihilObstat, DATE, 'the Censor stamped it');
    assert.ok(content.trim().length > 100, 'bulletin body present');
  }

  // The sky-beat's telescope wing was NOT touched by the body-beat.
  assert.ok(!existsSync(join(env.CONTENT_DIR, 'specola')), 'no Specola on the body-beat');

  // ---- Rounds: exactly one, written by Galeno, in his own voice/model -------
  const roundsDir = join(env.CONTENT_DIR, 'rounds');
  const roundsFiles = readdirSync(roundsDir);
  assert.equal(roundsFiles.length, 1, 'one Archiater\'s Rounds');
  const rounds = matter(readFileSync(join(roundsDir, roundsFiles[0]), 'utf8'));
  assert.equal(rounds.data.cardinal, 'galeno', 'the Archiater owns the floor, always');
  assert.equal(rounds.data.model, 'anthropic/claude-sonnet-5', 'substrate attribution is canon-truthful');
  assert.deepEqual(rounds.data.storyIds, ['s-organ-chip-01', 's-gene-edit-02', 's-billing-03']);
  assert.equal(rounds.data.stamps.imprimatur, DATE, 'the Inquisitor stamped the Rounds');
  assert.ok(rounds.content.includes('ward'), 'the ward-notes survived the presses');
  // Fiction wing → the Illuminator gilded it (fixture fal client).
  assert.equal(typeof rounds.data.illustration, 'string', 'Rounds plate filename present');
  assert.ok(existsSync(join(env.ASSETS_DIR, rounds.data.illustration)), 'Rounds plate bytes on disk');
  assert.match(rounds.data.illustrationAlt, /Archiater's Rounds/, 'alt text names the Rounds wing');

  // ---- NO Chronicle chapter (the novel belongs to the sky-beat) -------------
  assert.ok(!existsSync(join(env.CONTENT_DIR, 'chronicle')), 'the body-beat writes no Chronicle');
  // ---- NO Observer either (that is the sky-beat's satire wing) --------------
  assert.ok(!existsSync(join(env.CONTENT_DIR, 'observer')), 'the body-beat writes no Observer');

  // ---- Acta: beat-suffixed runId, and NO College/Chronicle/Archive stages ---
  const actaPath = join(env.CONTENT_DIR, 'acta', `${DATE}-medtech.json`);
  assert.ok(existsSync(actaPath), 'Acta runId carries the beat suffix (never collides with the sky-beat)');
  const acta = JSON.parse(readFileSync(actaPath, 'utf8'));
  assert.equal(acta.runId, `${DATE}-medtech`);
  assert.equal(acta.status, 'published');
  const stageNames = acta.stages.map((s) => s.stage);
  for (const wanted of ['nuncio', 'bulletins', 'dispatch', 'rounds', 'illuminate-rounds']) {
    assert.ok(stageNames.includes(wanted), `acta logs stage "${wanted}"`);
  }
  for (const forbidden of ['college', 'chronicle', 'archive', 'illuminate-chronicle', 'illuminate-dispatch']) {
    assert.ok(!stageNames.includes(forbidden), `body-beat runs no "${forbidden}" stage`);
  }

  // ---- NO College bidding: no win history written to worldstate -------------
  assert.ok(!existsSync(join(env.WORLD_DIR, 'college-wins.json')), 'no College means no win history');
});

// ---------------------------------------------------------------------------
test('quarantine: both beats run the same day into the same shelves without colliding', async () => {
  // The sky-beat first (it writes world/), then the body-beat (which reads world/
  // for the unseen-entity log but writes only its own wings).
  const aiResult = await runPipeline(aiCtx());
  assert.equal(aiResult.status, 'published', 'sky-beat still publishes cleanly — unchanged by the beat machinery');
  const medResult = await runPipeline(medCtx());
  assert.equal(medResult.status, 'published');

  // Both Actas coexist on the shelf, keyed by their beat-suffixed runIds.
  assert.ok(existsSync(join(env.CONTENT_DIR, 'acta', `${DATE}.json`)), 'sky-beat Acta present');
  assert.ok(existsSync(join(env.CONTENT_DIR, 'acta', `${DATE}-medtech.json`)), 'body-beat Acta present');

  // The sky-beat's wings are exactly what they always were.
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'specola')).length, 3, 'sky-beat: 3 Specola');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'observer')).length, 1, 'sky-beat: 1 Observer');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'chronicle')).length, 1, 'sky-beat: 1 Chronicle chapter');
  const obs = matter(readFileSync(join(env.CONTENT_DIR, 'observer', readdirSync(join(env.CONTENT_DIR, 'observer'))[0]), 'utf8'));
  assert.equal(obs.data.cardinal, 'cardinal-of-the-liberated-see', 'sky-beat College still adjudicates a winner');

  // The body-beat's wings are its own, and none of the sky-beat's crossed in.
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'lazaretto')).length, 3, 'body-beat: 3 Lazaretto');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'rounds')).length, 1, 'body-beat: 1 Rounds');

  // Cross-contamination checks: no medtech storyId in a Specola bulletin, and
  // no AI storyId in a Lazaretto bulletin. The cordon held.
  const specolaIds = readdirSync(join(env.CONTENT_DIR, 'specola'))
    .map((f) => matter(readFileSync(join(env.CONTENT_DIR, 'specola', f), 'utf8')).data.storyId);
  const lazIds = readdirSync(join(env.CONTENT_DIR, 'lazaretto'))
    .map((f) => matter(readFileSync(join(env.CONTENT_DIR, 'lazaretto', f), 'utf8')).data.storyId);
  assert.ok(specolaIds.every((id) => id.startsWith('s-meridian') || id.startsWith('s-sunset') || id.startsWith('s-edict')), 'only sky stories in the Specola');
  assert.ok(lazIds.every((id) => ['s-organ-chip-01', 's-gene-edit-02', 's-billing-03'].includes(id)), 'only body stories in the Lazaretto');
});

// ---------------------------------------------------------------------------
test('covered-ledger is beat-scoped: the body-beat does not dedupe against the Specola', async () => {
  // Seed the SKY-beat's factual archive with a bulletin whose storyId collides
  // with a body-beat story. If the Nuncio's ledger were not beat-scoped, the
  // body-beat would wrongly treat "s-organ-chip-01" as already-covered and drop
  // it, publishing only two Lazaretto bulletins. It must publish all three.
  const specolaDir = join(env.CONTENT_DIR, 'specola');
  mkdirSync(specolaDir, { recursive: true });
  writeFileSync(
    join(specolaDir, '2026-07-17-a-sky-beat-bulletin.md'),
    matter.stringify('\nA sky-beat bulletin that happens to share an id with a body story.\n', {
      title: 'A sky-beat bulletin', date: '2026-07-17', storyId: 's-organ-chip-01',
      citations: [{ title: 'x', url: 'https://example.com/x', source: 'TechCrunch AI' }],
      stamps: { nihilObstat: '2026-07-17' },
    }),
    'utf8',
  );

  const result = await runPipeline(medCtx());
  assert.equal(result.status, 'published');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'lazaretto')).length, 3,
    'the body-beat read ONLY its own (empty) Lazaretto ledger, so the colliding Specola id did not suppress the story');
});

// ---------------------------------------------------------------------------
test('CLI smoke: node pipeline/run.mjs --beat=medtech --fixtures completes, exit 0', () => {
  const result = spawnSync(process.execPath, ['pipeline/run.mjs', '--beat=medtech', '--fixtures', `--date=${DATE}`], {
    cwd: REPO,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, `CLI exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /\[editor\] done: published/);
  assert.match(result.stdout, /\[beat: medtech\]/);
  assert.ok(existsSync(join(env.CONTENT_DIR, 'acta', `${DATE}-medtech.json`)), 'CLI published the body-beat Acta');
});
