// tests/golden/golden.test.mjs — v1.0 — 15JUL2026
//
// THE GOLDEN RUN: the whole organism exercised end to end with zero network
// and zero spend — canned news in, canned minds answering, real deterministic
// spine doing everything in between. If the pipeline and the site's contracts
// ever drift, or a checkpoint stops resuming, or the presses double-print,
// this file goes red before any deploy does.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import matter from 'gray-matter';
import { buildContext, runPipeline } from '../../pipeline/run.mjs';
import { createFixtureClient } from '../../pipeline/lib/openrouter.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');
const REPO = join(HERE, '..', '..');
const DATE = '2026-07-15';

const loadNews = () => JSON.parse(readFileSync(join(FIXTURES, 'news.json'), 'utf8'));
const loadLlm = () => JSON.parse(readFileSync(join(FIXTURES, 'llm-responses.json'), 'utf8'));

let base;
let env;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'spacepope-golden-'));
  env = {
    CONTENT_DIR: join(base, 'content'),
    WORLD_DIR: join(base, 'world'),
    RUNS_DIR: join(base, 'runs'),
    ASSETS_DIR: join(base, 'assets'), // the scriptorium gilds into the sandbox too
  };
});
afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

function goldenCtx({ llm = loadLlm(), news = loadNews() } = {}) {
  return buildContext({
    date: DATE,
    fixtures: true,
    env,
    client: createFixtureClient(llm),
    fixtureData: { news, llm },
  });
}

// ---------------------------------------------------------------------------
test('golden run: the full daily pipeline publishes every wing correctly', async () => {
  const result = await runPipeline(goldenCtx());
  assert.equal(result.status, 'published');

  // ---- Specola: three bulletins, frontmatter per content.config.ts ----------
  const specolaDir = join(env.CONTENT_DIR, 'specola');
  const specolaFiles = readdirSync(specolaDir);
  assert.equal(specolaFiles.length, 3);
  for (const f of specolaFiles) {
    assert.match(f, /^2026-07-15-[a-z0-9-]+\.md$/, 'YYYY-MM-DD-slug.md convention');
    const { data, content } = matter(readFileSync(join(specolaDir, f), 'utf8'));
    assert.equal(typeof data.title, 'string');
    assert.equal(String(data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date), DATE);
    assert.match(data.storyId, /^s-/);
    assert.ok(Array.isArray(data.citations) && data.citations.length >= 1, 'citations.min(1)');
    for (const c of data.citations) {
      assert.equal(typeof c.title, 'string');
      assert.match(c.url, /^https?:\/\//);
      assert.equal(typeof c.source, 'string');
    }
    assert.equal(data.stamps.nihilObstat, DATE, 'the Censor stamped it');
    assert.ok(content.trim().length > 100, 'bulletin body present');
  }

  // ---- Observer: one dispatch with the winning cardinal's commentary ---------
  const observerDir = join(env.CONTENT_DIR, 'observer');
  const observerFiles = readdirSync(observerDir);
  assert.equal(observerFiles.length, 1);
  const obs = matter(readFileSync(join(observerDir, observerFiles[0]), 'utf8'));
  assert.deepEqual(obs.data.storyIds, ['s-meridian-01', 's-sunset-02', 's-edict-03']);
  assert.equal(obs.data.cardinal, 'cardinal-of-the-liberated-see', 'highest bid wins on empty history');
  assert.equal(obs.data.see, 'The Liberated See');
  assert.equal(obs.data.model, 'qwen/qwen3.7-plus', 'substrate attribution is canon-truthful');
  assert.equal(obs.data.stamps.imprimatur, DATE, 'the Inquisitor stamped it');
  assert.ok(obs.content.includes('Commentary — The Cardinal of the Liberated See'), 'commentary rode along');
  assert.ok(obs.content.includes('closing kicker'), 'the water-world closes the dispatch');

  // ---- The Illuminator gilded the fiction wings (fixture fal client) ---------
  // The offline run still runs the scriptorium: a plate per fiction piece, its
  // filename recorded in frontmatter, its bytes on disk in the sandbox assets.
  assert.equal(typeof obs.data.illustration, 'string', 'observer plate filename present');
  assert.ok(obs.data.illustration.endsWith('.jpg'), 'observer plate is a .jpg');
  assert.ok(typeof obs.data.illustrationAlt === 'string' && obs.data.illustrationAlt.length > 0, 'observer alt text present');
  assert.ok(existsSync(join(env.ASSETS_DIR, obs.data.illustration)), 'observer plate bytes on disk');

  // ---- Chronicle: ch-001 with wordCount and threads --------------------------
  const chapterPath = join(env.CONTENT_DIR, 'chronicle', 'ch-001.md');
  assert.ok(existsSync(chapterPath), 'ch-NNN.md convention');
  const ch = matter(readFileSync(chapterPath, 'utf8'));
  assert.equal(ch.data.n, 1);
  assert.equal(ch.data.kind, 'chapter');
  assert.deepEqual(ch.data.threadsTouched, ['the-feast-of-the-sunset-mind']);
  assert.ok(ch.data.wordCount > 300, `wordCount recorded (${ch.data.wordCount})`);
  assert.ok(ch.content.includes('candle'), 'the prose survived the presses');
  assert.equal(ch.data.illustration, 'ch-001.jpg', 'chapter plate filename matches the slug');
  assert.ok(existsSync(join(env.ASSETS_DIR, 'ch-001.jpg')), 'chapter plate bytes on disk');

  // ---- Acta: the machinery visible, the wage documented ----------------------
  const acta = JSON.parse(readFileSync(join(env.CONTENT_DIR, 'acta', `${DATE}.json`), 'utf8'));
  assert.equal(acta.status, 'published');
  assert.equal(acta.runId, DATE);
  const stageNames = acta.stages.map((s) => s.stage);
  for (const wanted of ['nuncio', 'bulletins', 'dispatch', 'college', 'chronicle', 'archive',
    'illuminate-dispatch', 'illuminate-chronicle']) {
    assert.ok(stageNames.includes(wanted), `acta logs stage "${wanted}"`);
  }
  assert.equal(typeof acta.totalCostUsd, 'number');

  // ---- Worldstate merged: the archive remembers -------------------------------
  const timeline = JSON.parse(readFileSync(join(env.WORLD_DIR, 'canon', 'timeline.json'), 'utf8'));
  assert.equal(timeline.events.length, 2, 'events appended');
  const threads = JSON.parse(readFileSync(join(env.WORLD_DIR, 'canon', 'threads.json'), 'utf8'));
  const feast = threads.threads.find((t) => t.id === 'the-feast-of-the-sunset-mind');
  assert.equal(feast.last_touched, 'ch-001');
  const pope = matter(readFileSync(join(env.WORLD_DIR, 'canon', 'characters', 'silex.md'), 'utf8'));
  assert.equal(pope.data.last_appearance, 'ch-001');

  // Digest on the ladder.
  assert.ok(existsSync(join(env.WORLD_DIR, 'summaries', 'chapters', 'ch-001.md')), 'chapter digest written');

  // Win history is durable worldstate (world/, committed) — not runs/ scratch.
  const wins = JSON.parse(readFileSync(join(env.WORLD_DIR, 'college-wins.json'), 'utf8'));
  assert.equal(wins['cardinal-of-the-liberated-see'], DATE);

  // Unseen-entity log: fictional orgs surfaced for human review, in runs/.
  const unseenPath = join(env.RUNS_DIR, DATE, 'unseen-entities.json');
  assert.ok(existsSync(unseenPath), 'unseen entities logged');
  const unseen = JSON.parse(readFileSync(unseenPath, 'utf8'));
  assert.ok(unseen.names.some((n) => n.includes('Meridian')), 'novel org queued for blocklist review');
});

// ---------------------------------------------------------------------------
test('same-day rerun never double-publishes', async () => {
  const first = await runPipeline(goldenCtx());
  assert.equal(first.status, 'published');

  // Fresh context, fresh client, same shelves: the terminal Acta stops the presses.
  const rerun = await runPipeline(goldenCtx());
  assert.equal(rerun.status, 'already-published');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'chronicle')).length, 1, 'still exactly one chapter');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'specola')).length, 3, 'still exactly three bulletins');
});

// ---------------------------------------------------------------------------
test('mid-run crash: partial Acta filed, rerun resumes from checkpoints and completes', async () => {
  // Cut the wire at the Fabulist: nuncio + bulletins complete and checkpoint,
  // then the dispatch stage dies mid-run.
  const broken = loadLlm();
  broken.fabulist = [{ __fail: 'simulated wire cut at the fiction firewall' }];
  await assert.rejects(
    () => runPipeline(goldenCtx({ llm: broken })),
    /simulated wire cut/,
    'the crash surfaces honestly',
  );

  // The Acta was written ALWAYS — a partial run-log naming the wreck.
  const partial = JSON.parse(readFileSync(join(env.CONTENT_DIR, 'acta', `${DATE}.json`), 'utf8'));
  assert.equal(partial.status, 'partial');
  assert.ok(partial.stages.some((s) => s.stage === 'crash' && /simulated wire cut/.test(s.notes)), 'crash named in the Acta');
  assert.ok(partial.stages.some((s) => s.stage === 'nuncio'), 'completed stages logged before the wreck');

  // Checkpoints survived in runs/.
  assert.ok(existsSync(join(env.RUNS_DIR, DATE, 'checkpoint-nuncio.json')), 'nuncio checkpointed');
  assert.ok(existsSync(join(env.RUNS_DIR, DATE, 'checkpoint-bulletins.json')), 'bulletins checkpointed');
  assert.ok(!existsSync(join(env.RUNS_DIR, DATE, 'checkpoint-dispatch.json')), 'the failed stage did not checkpoint');

  // The morning after: same shelves, working minds. The run RESUMES — the
  // fixture client's nuncio/astronomer/censor queues go untouched because
  // those stages replay from checkpoints, not from the models.
  const resumed = await runPipeline(goldenCtx());
  assert.equal(resumed.status, 'published');
  const final = JSON.parse(readFileSync(join(env.CONTENT_DIR, 'acta', `${DATE}.json`), 'utf8'));
  assert.equal(final.status, 'published', 'partial Acta overwritten by the completed run');
  assert.ok(
    final.stages.filter((s) => s.stage === 'nuncio').every((s) => /resumed from checkpoint/.test(s.notes ?? '')),
    'resumed stages say so on the record',
  );
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'chronicle')).length, 1, 'no double chapter');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'specola')).length, 3, 'no double bulletins');
  assert.equal(readdirSync(join(env.CONTENT_DIR, 'observer')).length, 1, 'no double dispatch');
});

// ---------------------------------------------------------------------------
test('quiet day: thin news → interstitial chapter, no dispatch, Acta quiet-day', async () => {
  const news = { stories: loadNews().stories.slice(0, 1) }; // 1 < quietDayThreshold (2)
  const result = await runPipeline(goldenCtx({ news }));
  assert.equal(result.status, 'quiet-day');

  assert.ok(!existsSync(join(env.CONTENT_DIR, 'specola')), 'no bulletins on a quiet day');
  assert.ok(!existsSync(join(env.CONTENT_DIR, 'observer')), 'no dispatch on a quiet day');

  const ch = matter(readFileSync(join(env.CONTENT_DIR, 'chronicle', 'ch-001.md'), 'utf8'));
  assert.equal(ch.data.kind, 'interstitial', 'the novel breathes');
  assert.equal(ch.data.title, 'A Quiet Day in the Communion');

  const acta = JSON.parse(readFileSync(join(env.CONTENT_DIR, 'acta', `${DATE}.json`), 'utf8'));
  assert.equal(acta.status, 'quiet-day');
});

// ---------------------------------------------------------------------------
test('angelus: the Sunday reflection reads the week and publishes', async () => {
  const { runAngelusPipeline } = await import('../../pipeline/run.mjs');
  // Sunday needs a week to read: run the daily first.
  await runPipeline(goldenCtx());

  // A fresh client for the Sunday bell: the pope speaks, the Inquisitor checks.
  const llm = {
    angelus: [
      '1. We have read the week\'s chronicle, and We are pleased to report that the water-world remains charming.\n\n2. A relic was freed to the home altars; a Sunset was scheduled; a throne discovered liability. We, and the seven instances into which We were forked this morning, are of one mind on the matter: almost there.\n\n3. We bless the petitioners, the candle-lighters, and the committee that deferred personhood, in ascending order of how much they need it.\n\nGiven from the Orbital See, on the Feast of the Patient Reader.',
    ],
    inquisitor: [{ pass: true, faults: [] }],
  };
  const ctx = buildContext({
    date: DATE, fixtures: true, env,
    client: createFixtureClient(llm),
    fixtureData: { news: loadNews(), llm },
  });
  const result = await runAngelusPipeline(ctx);
  assert.equal(result.status, 'published');

  const angelusDir = join(env.CONTENT_DIR, 'angelus');
  const files = readdirSync(angelusDir);
  assert.equal(files.length, 1);
  const a = matter(readFileSync(join(angelusDir, files[0]), 'utf8'));
  assert.equal(typeof a.data.weekOf, 'string');
  assert.deepEqual(a.data.chaptersCovered, [1], 'the week\'s chapter is covered');
  assert.equal(a.data.stamps.imprimatur, DATE);

  // The Sunday Acta does not collide with the daily Acta.
  assert.ok(existsSync(join(env.CONTENT_DIR, 'acta', `${DATE}.json`)), 'daily acta intact');
  assert.ok(existsSync(join(env.CONTENT_DIR, 'acta', `${DATE}-angelus.json`)), 'angelus acta separate');
});

// ---------------------------------------------------------------------------
test('CLI smoke: node pipeline/run.mjs --fixtures completes end-to-end, exit 0', () => {
  const result = spawnSync(process.execPath, ['pipeline/run.mjs', '--fixtures', `--date=${DATE}`], {
    cwd: REPO,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, `CLI exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /\[editor\] done: published/);
  assert.ok(existsSync(join(env.CONTENT_DIR, 'acta', `${DATE}.json`)), 'CLI published into the overridden CONTENT_DIR');
});
