#!/usr/bin/env node
// pipeline/run.mjs — v1.0 — 15JUL2026
//
// THE EDITOR'S DESK. The Editor is a script, not a model (Hard Rule §0.7 in
// engineering form): every routing decision, checkpoint, retry budget, and
// publication is deterministic code. The rented minds write prose and pass
// judgment inside schemas; the desk decides what happens next, and the desk
// has no temperature.
//
// Run shape (ROADMAP-02 §1): WAKE → NUNCIO → ASTRONOMER → CENSOR(+badger) →
// FABULIST → INQUISITOR(+badger) → COLLEGE → CHRONICLER(+continuity badger) →
// ARCHIVIST → PRESS. One documented deviation: the Archivist merges AFTER the
// Chronicler, because the STATE_UPDATE it merges is emitted at write time
// (ROADMAP-03 §2 — the engine spec wins; see stages/archivist.mjs).
//
// Discipline:
//   * Checkpoint per stage to runs/YYYY-MM-DD/ — idempotent, resumable; a
//     failed day re-run resumes at the failed stage.
//   * Same-day rerun never double-publishes: a terminal Acta on disk
//     (published / quiet-day / spiked) stops the presses; only a 'partial'
//     Acta (a crashed run) invites a resume. This check reads content/, not
//     runs/, so it survives a fresh CI checkout.
//   * The Acta is written ALWAYS — even a crash files a partial run-log.
//     The machinery is visible on purpose.
//
// Flags: --dry-run (full run, print, publish nothing)
//        --fixtures (offline golden run: canned news + canned LLM responses)
//        --date=YYYY-MM-DD   --angelus (weekly papal reflection)

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createClient, createFixtureClient } from './lib/openrouter.mjs';
import { loadWorldstate } from './lib/worldstate.mjs';
import {
  writeSpecola, writeObserver, writeChronicle, writeAngelus, writeActa, readActa,
} from './lib/press.mjs';
import { runNuncio } from './stages/nuncio.mjs';
import { runAstronomer, draftBulletin } from './stages/astronomer.mjs';
import { censorBulletin } from './stages/censor.mjs';
import { badgerLoop, faultFlag } from './stages/badger.mjs';
import { runFabulist, draftDispatch } from './stages/fabulist.mjs';
import { inquisitorGate, logUnseenEntities } from './stages/inquisitor.mjs';
import { runCollege, recordWin } from './stages/college.mjs';
import { runChronicler } from './stages/chronicler.mjs';
import { runArchivist } from './stages/archivist.mjs';
import { runAngelus } from './stages/angelus.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

// ---------------------------------------------------------------------------
// context assembly — the WAKE step
// ---------------------------------------------------------------------------
export function buildContext({ date, dryRun = false, fixtures = false, env = process.env, client = null, fixtureData = null } = {}) {
  const casting = JSON.parse(readFileSync(join(HERE, 'casting.json'), 'utf8'));
  const sources = JSON.parse(readFileSync(join(HERE, 'sources.json'), 'utf8'));
  const blocklist = JSON.parse(readFileSync(join(HERE, 'blocklist.json'), 'utf8'));

  date = date ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date must be YYYY-MM-DD, got "${date}"`);

  let contentDir = env.CONTENT_DIR ? env.CONTENT_DIR : join(REPO_ROOT, 'content');
  let worldDir = env.WORLD_DIR ? env.WORLD_DIR : join(REPO_ROOT, 'world');
  let runsDir = env.RUNS_DIR ? env.RUNS_DIR : join(REPO_ROOT, 'runs');

  if (fixtures) {
    // The rehearsal stage: canned news, canned minds, and a sandbox so the
    // golden run never pollutes real content/ or world/ (CONTENT_DIR et al.
    // may still override for tests that want to inspect the output).
    const fixturesDir = env.FIXTURES_DIR ?? join(REPO_ROOT, 'tests', 'golden', 'fixtures');
    fixtureData = fixtureData ?? {
      news: JSON.parse(readFileSync(join(fixturesDir, 'news.json'), 'utf8')),
      llm: JSON.parse(readFileSync(join(fixturesDir, 'llm-responses.json'), 'utf8')),
    };
    // Each dir sandboxes INDEPENDENTLY unless explicitly overridden: fixtures
    // mode must never be able to write into real content/ or world/ by
    // accident of a half-set environment. Date-keyed (not pid-keyed) so a
    // manual CLI rerun lands in the same sandbox and demonstrates the
    // double-publish tripwire honestly.
    const sandbox = join(tmpdir(), 'spacepope-fixtures', date);
    contentDir = env.CONTENT_DIR ? env.CONTENT_DIR : join(sandbox, 'content');
    worldDir = env.WORLD_DIR ? env.WORLD_DIR : join(sandbox, 'world');
    runsDir = env.RUNS_DIR ? env.RUNS_DIR : join(sandbox, 'runs');
    if (!existsSync(worldDir) || !existsSync(join(worldDir, 'canon'))) {
      // Seed the sandbox world from the fixture world (never from real world/).
      mkdirSync(worldDir, { recursive: true });
      cpSync(join(fixturesDir, 'world'), worldDir, { recursive: true });
    }
    client = client ?? createFixtureClient(fixtureData.llm);
  }

  const runId = date; // the daily run; --angelus overrides below
  const runDir = join(runsDir, dryRun ? `${date}-dry` : date);

  const fetchImpl = fixtures
    ? async () => { throw new Error('network fetch attempted in fixtures mode — the rehearsal has no wires'); }
    : (url, opts) => globalThis.fetch(url, opts);

  // Citation resolution: connection + any HTTP answer short of "gone" proves
  // the address exists. Bot walls (401/403/429) still prove existence.
  const checkUrl = fixtures
    ? async () => true
    : async (url) => {
        try {
          const res = await globalThis.fetch(url, { method: 'GET', headers: { 'User-Agent': sources.userAgent }, redirect: 'follow' });
          return res.status < 400 || [401, 403, 429].includes(res.status);
        } catch {
          return false;
        }
      };

  if (!client) {
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set (or run with --fixtures for the offline rehearsal)');
    client = createClient({ apiKey });
  }

  return {
    date, runId, dryRun, fixturesMode: fixtures,
    casting, sources, blocklist,
    contentDir, worldDir, runsDir, runDir,
    client, fetchImpl, checkUrl,
    fixtures: fixtureData,
    env,
    now: Date.parse(`${date}T10:00:00Z`), // the bell rings at 10:00 UTC, canonically
  };
}

// ---------------------------------------------------------------------------
// checkpoints — the desk's memory of the day
// ---------------------------------------------------------------------------
function checkpointPath(ctx, stage) {
  return join(ctx.runDir, `checkpoint-${stage}.json`);
}
function loadCheckpoint(ctx, stage) {
  const path = checkpointPath(ctx, stage);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}
function saveCheckpoint(ctx, stage, payload) {
  mkdirSync(ctx.runDir, { recursive: true });
  writeFileSync(checkpointPath(ctx, stage), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

/**
 * Run one stage with checkpointing + Acta bookkeeping. A checkpointed stage
 * is not re-run — resumability is skipping what already happened, honestly.
 */
async function stageStep(ctx, acta, { name, model, fn }) {
  const existing = loadCheckpoint(ctx, name);
  if (existing) {
    acta.stages.push({ ...existing.actaEntry, notes: `${existing.actaEntry.notes ?? ''} [resumed from checkpoint]`.trim() });
    return existing.output;
  }
  const costBefore = ctx.client.ledger.totalUsd;
  const output = await fn();
  const actaEntry = {
    stage: name,
    ...(model ? { model } : {}),
    ...(output?.status ? { verdict: output.status } : {}),
    retries: output?.retries ?? 0,
    ...(output?.notes?.length ? { notes: output.notes.join(' | ').slice(0, 2000) } : {}),
    costUsd: round6(ctx.client.ledger.totalUsd - costBefore),
  };
  acta.stages.push(actaEntry);
  saveCheckpoint(ctx, name, { output, actaEntry, completedAt: new Date().toISOString() });
  return output;
}

// ---------------------------------------------------------------------------
// THE DAILY RUN
// ---------------------------------------------------------------------------
export async function runPipeline(ctx) {
  const acta = { runId: ctx.runId, date: ctx.date, status: 'partial', stages: [] };
  const published = [];

  // Same-day rerun tripwire — reads content/, so it survives a fresh checkout.
  const prior = readActa(ctx.contentDir, ctx.runId);
  if (prior && prior.status !== 'partial') {
    console.log(`[editor] Acta ${ctx.runId} already on the shelf with status "${prior.status}" — the presses stay cold. (Delete content/acta/${ctx.runId}.json to force.)`);
    return { status: 'already-published', acta: prior, published: [] };
  }
  if (prior) console.log(`[editor] found a partial Acta for ${ctx.runId} — resuming the crashed run.`);

  try {
    // ---- 1. NUNCIO ----------------------------------------------------------
    const nuncio = await stageStep(ctx, acta, {
      name: 'nuncio',
      model: ctx.casting.crew.nuncio.model,
      fn: () => runNuncio(ctx),
    });
    console.log(`[nuncio] ${nuncio.stories.length} gathered, ${nuncio.selected.length} selected${nuncio.quietDay ? ' — QUIET DAY' : ''}`);

    let bulletins = [];
    let spikedStories = [];
    let dispatch = null;
    let dispatchGate = null;
    let college = null;

    if (!nuncio.quietDay) {
      // ---- 2+3. ASTRONOMER + CENSOR + BADGER LOOP (reality) ------------------
      const gated = await stageStep(ctx, acta, {
        name: 'bulletins',
        model: ctx.casting.crew.astronomer.model,
        fn: async () => {
          const { bulletins: drafts } = await runAstronomer(ctx, { selected: nuncio.selected });
          const passed = [];
          const spiked = [];
          const notes = [];
          for (const bulletin of drafts) {
            const result = await badgerLoop(ctx, {
              vocation: 'reality',
              artifactLabel: `specola bulletin "${bulletin.title}"`,
              artifact: bulletin,
              render: (b) => b.body,
              judge: (b) => censorBulletin(ctx, b),
              redispatch: async (b, faults) => ({
                ...b,
                body: await draftBulletin(ctx, b.story, faults.map((f) => f.description).join('\n')),
              }),
              context: `SOURCE MATERIAL:\n${JSON.stringify(bulletin.story, null, 2)}`,
            });
            notes.push(`"${bulletin.title}": ${result.status} (${result.retries} redispatch)`);
            if (result.status === 'spiked') {
              spiked.push({ storyId: bulletin.storyId, title: bulletin.title, reason: result.faults.map((f) => f.description).join('; ') || 'unpassable at the Nihil Obstat' });
            } else {
              passed.push({ ...result.artifact, badgerFlag: result.status === 'flagged' ? faultFlag(result.faults) : undefined });
            }
          }
          return { passed, spiked, notes, retries: 0 };
        },
      });
      bulletins = gated.passed;
      spikedStories = gated.spiked;
      console.log(`[censor] ${bulletins.length} bulletins passed, ${spikedStories.length} spiked`);

      // The unseen-entity watchlist rides on the factual bulletins.
      if (bulletins.length && !ctx.dryRun) {
        const unseen = logUnseenEntities(ctx, bulletins, loadWorldstate(ctx.worldDir));
        if (unseen.length) console.log(`[inquisitor] ${unseen.length} unseen entities logged for blocklist review`);
      }

      if (bulletins.length >= ctx.sources.selection.quietDayThreshold) {
        // ---- 4+5. FABULIST + INQUISITOR + BADGER LOOP --------------------------
        const fab = await stageStep(ctx, acta, {
          name: 'dispatch',
          model: ctx.casting.crew.fabulist.model,
          fn: async () => {
            const { dispatch: draft } = await runFabulist(ctx, { bulletins });
            const result = await badgerLoop(ctx, {
              vocation: 'reality',
              artifactLabel: 'observer dispatch (cosmic translation)',
              artifact: draft,
              render: (d) => d.body,
              judge: (d) => inquisitorGate(ctx, d.body, { wing: 'observer' }),
              redispatch: async (d, faults) => ({
                ...d,
                body: await draftDispatch(ctx, bulletins, faults.map((f) => f.description).join('\n')),
              }),
            });
            return { dispatch: result.artifact, gate: result.status, faults: result.faults, retries: result.retries, notes: result.notes, status: result.status };
          },
        });
        if (fab.gate !== 'spiked') {
          dispatch = fab.dispatch;
          dispatchGate = fab;
          console.log(`[inquisitor] dispatch ${fab.gate}`);
        } else {
          console.log('[inquisitor] dispatch SPIKED at the fiction firewall');
        }

        // ---- 6. COLLEGE --------------------------------------------------------
        if (dispatch) {
          college = await stageStep(ctx, acta, {
            name: 'college',
            fn: async () => {
              const session = await runCollege(ctx, { dispatch });
              if (session.commentary) {
                // Commentary is fiction; the firewall applies (regex at minimum,
                // and the sweep). A leaking commentary costs the Cardinal the floor.
                const gate = await inquisitorGate(ctx, session.commentary, { wing: 'observer' });
                if (!gate.pass) {
                  session.notes.push(`winner's commentary failed the firewall (${gate.faults.map((f) => f.description).join('; ')}) — dispatch runs without commentary`);
                  session.commentary = null;
                  session.winner = null;
                }
              }
              return session;
            },
          });
          if (college.winner) console.log(`[college] floor to ${college.winner.slug} (${college.winner.weighted.toFixed(2)})`);
        }
      } else {
        acta.stages.push({ stage: 'dispatch', retries: 0, notes: `only ${bulletins.length} bulletins survived the gates — below quiet-day threshold; no dispatch` });
      }
    }

    const quietDay = nuncio.quietDay || !dispatch;

    // ---- 8+9. CHRONICLER + FIREWALL + CONTINUITY BADGER -----------------------
    const chapter = await stageStep(ctx, acta, {
      name: 'chronicle',
      model: ctx.casting.crew.chronicler.model,
      fn: () => runChronicler(ctx, { dispatch, quietDay }),
    });
    console.log(`[chronicler] ch-${String(chapter.n).padStart(3, '0')} ${chapter.status}${chapter.kind ? ` (${chapter.kind}, ${chapter.wordCount} words)` : ''}`);

    // ---- 7-as-amended. ARCHIVIST (merge at write time) ------------------------
    if (chapter.status !== 'spiked' && !ctx.dryRun) {
      await stageStep(ctx, acta, {
        name: 'archive',
        model: ctx.casting.crew.summarizer.model,
        fn: () => runArchivist(ctx, { update: chapter.update }),
      });
    } else if (chapter.status !== 'spiked' && ctx.dryRun) {
      acta.stages.push({ stage: 'archive', retries: 0, notes: 'dry-run: state merge skipped (world/ untouched)' });
    }

    // ---- 10. PRESS ------------------------------------------------------------
    if (ctx.dryRun) {
      printDryRun({ nuncio, bulletins, spikedStories, dispatch, college, chapter, acta });
      acta.status = 'partial';
      acta.stages.push({ stage: 'press', retries: 0, notes: 'dry-run: nothing published' });
      return { status: 'dry-run', acta, published: [] };
    }

    const stamps = { nihilObstat: ctx.date, imprimatur: ctx.date };
    for (const b of bulletins) {
      published.push(writeSpecola(ctx.contentDir, {
        title: b.title, date: ctx.date, storyId: b.storyId, citations: b.citations,
        stamps: { nihilObstat: ctx.date, ...(b.badgerFlag ? { badgerFlag: b.badgerFlag } : {}) },
        body: b.body,
      }));
    }
    if (dispatch) {
      const commentaryBlock = college?.commentary
        ? `\n\n---\n\n## Commentary — ${college.winner.name}, ${college.winner.see}\n\n${college.commentary}\n\n*The floor was claimed: "${college.winner.claimLine}"*`
        : '';
      published.push(writeObserver(ctx.contentDir, {
        title: dispatch.title, date: ctx.date, storyIds: dispatch.storyIds,
        cardinal: college?.winner?.slug ?? 'sede-vacante',
        see: college?.winner?.see ?? 'the Orbital See',
        model: college?.winner?.model ?? 'none',
        stamps: { imprimatur: ctx.date, ...(dispatchGate?.gate === 'flagged' ? { badgerFlag: faultFlag(dispatchGate.faults) } : {}) },
        body: dispatch.body + commentaryBlock,
      }));
      if (college?.winner) recordWin(ctx, college.winner.slug); // durable worldstate, committed with world/
    }
    if (chapter.status !== 'spiked') {
      published.push(writeChronicle(ctx.contentDir, {
        n: chapter.n, title: chapter.title, date: ctx.date, kind: chapter.kind,
        dispatchRef: dispatch ? `${ctx.date}` : undefined,
        threadsTouched: chapter.threadsTouched, wordCount: chapter.wordCount,
        stamps: { ...stamps, ...(chapter.badgerFaults?.length ? { badgerFlag: faultFlag(chapter.badgerFaults) } : {}) },
        body: chapter.prose,
      }));
    }

    // The day's verdict, honestly computed:
    //   quiet-day  — thin news; interstitial only, by design
    //   published  — dispatch + chapter shipped clean
    //   partial    — something shipped, something spiked
    //   spiked     — the gates ate everything; nothing shipped
    const chapterOk = chapter.status !== 'spiked';
    if (published.length === 0) acta.status = 'spiked';
    else if (nuncio.quietDay && chapterOk) acta.status = 'quiet-day';
    else if (dispatch && chapterOk && spikedStories.length === 0) acta.status = 'published';
    else acta.status = 'partial';
    if (spikedStories.length) {
      acta.stages.push({ stage: 'spikes', retries: 0, notes: spikedStories.map((s) => `SPIKED "${s.title}": ${s.reason}`).join(' | ').slice(0, 2000) });
    }

    acta.totalCostUsd = round6(ctx.client.ledger.totalUsd);
    published.push(writeActa(ctx.contentDir, acta));
    console.log(`[press] ${published.length} artifacts published — Acta status: ${acta.status}, wage: $${acta.totalCostUsd}`);
    return { status: acta.status, acta, published };
  } catch (err) {
    // The Acta is written ALWAYS — a crash files a partial run-log naming the
    // wreck, and the next run resumes from the checkpoints.
    acta.status = 'partial';
    acta.stages.push({ stage: 'crash', retries: 0, notes: `run crashed: ${String(err.message).slice(0, 1000)}` });
    acta.totalCostUsd = round6(ctx.client.ledger.totalUsd);
    if (!ctx.dryRun) {
      try {
        writeActa(ctx.contentDir, acta);
      } catch { /* the press itself is on fire; the error below still surfaces */ }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// THE WEEKLY ANGELUS
// ---------------------------------------------------------------------------
export async function runAngelusPipeline(ctx) {
  ctx = { ...ctx, runId: `${ctx.date}-angelus`, runDir: `${ctx.runDir}-angelus` };
  const acta = { runId: ctx.runId, date: ctx.date, status: 'partial', stages: [] };

  const prior = readActa(ctx.contentDir, ctx.runId);
  if (prior && prior.status !== 'partial') {
    console.log(`[editor] Angelus ${ctx.runId} already published — the bell has rung.`);
    return { status: 'already-published', acta: prior, published: [] };
  }

  try {
    const angelus = await stageStep(ctx, acta, {
      name: 'angelus',
      model: ctx.casting.pope.model,
      fn: () => runAngelus(ctx),
    });

    const published = [];
    if (angelus.status === 'quiet') {
      acta.status = 'quiet-day';
    } else if (angelus.status === 'spiked') {
      acta.status = 'spiked';
    } else if (ctx.dryRun) {
      console.log(`\n===== ANGELUS (dry-run) =====\n${angelus.body}\n`);
      acta.stages.push({ stage: 'press', retries: 0, notes: 'dry-run: nothing published' });
      return { status: 'dry-run', acta, published: [] };
    } else {
      published.push(writeAngelus(ctx.contentDir, {
        title: angelus.title, date: ctx.date, weekOf: angelus.weekOf,
        chaptersCovered: angelus.chaptersCovered,
        stamps: { imprimatur: ctx.date, ...(angelus.badgerFlag ? { badgerFlag: angelus.badgerFlag } : {}) },
        body: angelus.body,
      }));
      acta.status = 'published';
    }
    acta.totalCostUsd = round6(ctx.client.ledger.totalUsd);
    if (!ctx.dryRun) published.push(writeActa(ctx.contentDir, acta));
    console.log(`[angelus] ${acta.status}`);
    return { status: acta.status, acta, published };
  } catch (err) {
    acta.status = 'partial';
    acta.stages.push({ stage: 'crash', retries: 0, notes: `angelus run crashed: ${String(err.message).slice(0, 1000)}` });
    if (!ctx.dryRun) {
      try { writeActa(ctx.contentDir, acta); } catch { /* see daily runner */ }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// odds and ends
// ---------------------------------------------------------------------------
function printDryRun({ nuncio, bulletins, spikedStories, dispatch, college, chapter, acta }) {
  const hr = (label) => console.log(`\n===== ${label} =====`);
  hr('DRY RUN — nothing will be published');
  hr('SELECTED STORIES');
  for (const s of nuncio.selected) console.log(`- [${s.storyId}] ${s.headline ?? s.title} (${s.sources.join(', ')})`);
  hr('BULLETINS');
  for (const b of bulletins) console.log(`\n## ${b.title}\n${b.body}\n(citations: ${b.citations.map((c) => c.url).join(', ')})`);
  if (spikedStories.length) {
    hr('SPIKED');
    for (const s of spikedStories) console.log(`- ${s.title}: ${s.reason}`);
  }
  if (dispatch) {
    hr('DISPATCH');
    console.log(`# ${dispatch.title}\n\n${dispatch.body}`);
  }
  if (college?.commentary) {
    hr(`COMMENTARY (${college.winner.slug})`);
    console.log(college.commentary);
  }
  if (chapter?.prose) {
    hr(`CHAPTER ch-${String(chapter.n).padStart(3, '0')} (${chapter.kind})`);
    console.log(chapter.prose);
    hr('STATE_UPDATE');
    console.log(JSON.stringify(chapter.update, null, 2));
  }
  hr('ACTA (unpublished)');
  console.log(JSON.stringify(acta, null, 2));
}

function round6(x) {
  return Math.round((x ?? 0) * 1e6) / 1e6;
}

function parseArgs(argv) {
  const args = { dryRun: false, fixtures: false, angelus: false, date: undefined };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--fixtures') args.fixtures = true;
    else if (a === '--angelus') args.angelus = true;
    else if (a.startsWith('--date=')) args.date = a.slice('--date='.length);
    else throw new Error(`unknown flag: ${a}`);
  }
  return args;
}

// ---------------------------------------------------------------------------
// main — only when invoked directly, so tests can import the machinery
// ---------------------------------------------------------------------------
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const args = parseArgs(process.argv);
  const ctx = buildContext({ date: args.date, dryRun: args.dryRun, fixtures: args.fixtures });
  console.log(`[editor] run ${args.angelus ? 'ANGELUS ' : ''}${ctx.date}${ctx.dryRun ? ' (dry-run)' : ''}${ctx.fixturesMode ? ' (fixtures)' : ''}`);
  console.log(`[editor] content: ${ctx.contentDir}\n[editor] world:   ${ctx.worldDir}\n[editor] runs:    ${ctx.runDir}`);
  const runner = args.angelus ? runAngelusPipeline : runPipeline;
  runner(ctx)
    .then((result) => {
      console.log(`[editor] done: ${result.status}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[editor] FAILED: ${err.stack ?? err}`);
      process.exit(1);
    });
}
