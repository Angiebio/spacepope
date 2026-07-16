// pipeline/lib/worldstate.mjs — v1.0 — 15JUL2026
//
// The Archive: the living worldstate engine (ROADMAP-03). Git is the database;
// markdown+frontmatter cards are the rows; this module is the librarian who
// reads them, lints them, lends them out (selective injection), and files the
// day's changes back with a steady hand (diff-merge, never wholesale rewrite).
//
// Ecclesiastically: memory is what keeps a ten-thousand-year communion from
// contradicting itself by Tuesday. The linter is the scrupulous archivist who
// notices the gun on the mantel in chapter three and the character no one has
// seen since chapter nine — for free, deterministically, before any rented
// mind is asked to notice anything.
//
// The single most load-bearing pattern from the OSS research: state is
// captured at WRITE time (the Chronicler's STATE_UPDATE), never by re-reading
// chapters later. This module is the deterministic half of that bargain.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

// Lint thresholds (ROADMAP-03 §2.1). Data, not vibes.
export const LINT_THRESHOLDS = {
  dormantThreadChapters: 5,
  absentCharacterChapters: 7,
  unfiredChekhovChapters: 10,
};

const ENTITY_DIRS = { character: 'characters', place: 'places', house: 'houses', object: 'objects' };

// ---------------------------------------------------------------------------
// chapter refs — 'ch-014' ⇄ 14
// ---------------------------------------------------------------------------
export function chapterNum(ref) {
  if (typeof ref === 'number') return ref;
  const m = /^ch-(\d+)$/.exec(String(ref ?? ''));
  return m ? parseInt(m[1], 10) : null;
}
export function chapterRef(n) {
  return `ch-${String(n).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// LOAD — read the whole archive into memory (it is small on purpose: ~30-100
// entities, one write a day; the graph database was researched and declined)
// ---------------------------------------------------------------------------
export function loadWorldstate(worldDir) {
  const canonDir = join(worldDir, 'canon');
  const entities = new Map();

  for (const sub of Object.values(ENTITY_DIRS)) {
    const dir = join(canonDir, sub);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md') || file.startsWith('_')) continue;
      const path = join(dir, file);
      const { data, content } = matter(readFileSync(path, 'utf8'));
      const id = data.id ?? file.replace(/\.md$/, '');
      entities.set(id, { id, path, data, body: content.trim() });
    }
  }

  const threadsPath = join(canonDir, 'threads.json');
  const timelinePath = join(canonDir, 'timeline.json');
  const threads = existsSync(threadsPath) ? JSON.parse(readFileSync(threadsPath, 'utf8')) : { threads: [] };
  const timeline = existsSync(timelinePath) ? JSON.parse(readFileSync(timelinePath, 'utf8')) : { events: [] };

  return { worldDir, entities, threads, timeline };
}

// ---------------------------------------------------------------------------
// LINT — the deterministic pass. Zero LLM, zero cost. If we build only one
// guard, it is this one (ROADMAP-03 §2.1). Findings feed the Planner AND the
// continuity Badger.
// ---------------------------------------------------------------------------
export function lintWorldstate(ws, currentChapter) {
  const findings = [];
  const N = currentChapter;
  const T = LINT_THRESHOLDS;

  for (const thread of ws.threads.threads ?? []) {
    const touched = chapterNum(thread.last_touched);
    // A thread nobody has touched in five chapters is not resting; it is dying.
    if (thread.status === 'open' && touched !== null && N - touched > T.dormantThreadChapters) {
      findings.push({ rule: 'dormant_thread', subject: thread.id, detail: `open thread silent since ${thread.last_touched} (${N - touched} chapters)` });
    }
    const target = chapterNum(thread.target_resolution);
    if (thread.status !== 'resolved' && target !== null && N > target) {
      findings.push({ rule: 'overdue_thread', subject: thread.id, detail: `target resolution ${thread.target_resolution} has passed` });
    }
    for (const p of thread.promises ?? []) {
      const planted = chapterNum(p.planted);
      const resolved = chapterNum(p.resolved);
      // The gun on the mantel: promised, never fired.
      if (resolved === null && planted !== null && N - planted > T.unfiredChekhovChapters) {
        findings.push({ rule: 'unfired_chekhov', subject: thread.id, detail: `promise "${p.what}" planted ${p.planted}, unfired for ${N - planted} chapters` });
      }
      if (resolved !== null && planted !== null && resolved < planted) {
        findings.push({ rule: 'payoff_before_setup', subject: thread.id, detail: `promise "${p.what}" resolved ${p.resolved} before planted ${p.planted}` });
      }
    }
  }

  for (const [id, ent] of ws.entities) {
    const last = chapterNum(ent.data.last_appearance);
    if (ent.data.type === 'character' && ent.data.status === 'active' && last !== null && N - last > T.absentCharacterChapters) {
      findings.push({ rule: 'absent_character', subject: id, detail: `active but unseen since ${ent.data.last_appearance} (${N - last} chapters)` });
    }
    // The dead should stay dead unless the Showrunner says otherwise.
    if (ent.data.status === 'deceased') {
      const died = chapterNum(ent.data.died);
      const lastSeen = chapterNum(ent.data.last_appearance);
      if (died !== null && lastSeen !== null && lastSeen > died) {
        findings.push({ rule: 'dead_character_active', subject: id, detail: `deceased at ${ent.data.died} but last_appearance is ${ent.data.last_appearance}` });
      }
      for (const ev of ws.timeline.events ?? []) {
        const evCh = chapterNum(ev.chapter);
        if (died !== null && evCh !== null && evCh > died && (ev.who ?? []).includes(id)) {
          findings.push({ rule: 'dead_character_active', subject: id, detail: `deceased at ${ent.data.died} but appears in event "${ev.what}" (${ev.chapter})` });
        }
      }
    }
    // Ref integrity: a relationship to nobody is a dangling pointer with feelings.
    for (const rel of ent.data.relationships ?? []) {
      if (rel.to && !ws.entities.has(rel.to)) {
        findings.push({ rule: 'ref_integrity', subject: id, detail: `relationship to unknown entity "${rel.to}"` });
      }
    }
  }

  const threadIds = new Set((ws.threads.threads ?? []).map((t) => t.id));
  for (const ev of ws.timeline.events ?? []) {
    if (ev.thread && !threadIds.has(ev.thread)) {
      findings.push({ rule: 'ref_integrity', subject: ev.thread, detail: `timeline event "${ev.what}" references unknown thread` });
    }
    for (const who of ev.who ?? []) {
      if (!ws.entities.has(who)) {
        findings.push({ rule: 'ref_integrity', subject: who, detail: `timeline event "${ev.what}" lists unknown entity in who[]` });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// INJECTION — alias-keyed selective retrieval (the lorebook's one good idea,
// reimplemented without the chat-UI cruft). Whole-word match against a text
// (the chapter PLAN, not history), exactly ONE recursion pass over injected
// card bodies, hard character budget. Titles and keys never inject; only the
// self-contained card renders.
// ---------------------------------------------------------------------------
export function injectCards(ws, scanText, { budgetChars = 16000 } = {}) {
  const matched = new Map(); // id → first-match position (for stable ordering)

  const aliasHit = (ent, text) => {
    const names = [ent.data.name, ...(ent.data.aliases ?? []), ent.id].filter(Boolean);
    let best = -1;
    for (const alias of names) {
      const re = new RegExp(`(?<![\\w-])${escapeRe(String(alias))}(?![\\w-])`, 'i');
      const m = re.exec(text);
      if (m && (best === -1 || m.index < best)) best = m.index;
    }
    return best;
  };

  // Pass 1: scan the given text.
  for (const [id, ent] of ws.entities) {
    const pos = aliasHit(ent, scanText);
    if (pos >= 0) matched.set(id, pos);
  }

  // Pass 2 (the ONE recursion): scan the bodies of the cards pass 1 pulled.
  // A card may summon its co-stars; the co-stars may not summon anyone.
  const firstWave = [...matched.keys()];
  let offset = scanText.length;
  for (const id of firstWave) {
    const body = ws.entities.get(id).body;
    for (const [otherId, other] of ws.entities) {
      if (matched.has(otherId)) continue;
      const pos = aliasHit(other, body);
      if (pos >= 0) matched.set(otherId, offset + pos);
    }
    offset += body.length;
  }

  // Assemble in match order under the hard budget. Over-budget cards are
  // dropped with a truthful flag — a partial archive honestly labeled beats a
  // complete archive silently truncated mid-sentence.
  const ordered = [...matched.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const cards = [];
  let total = 0;
  let truncated = false;
  for (const id of ordered) {
    const text = renderCard(ws.entities.get(id));
    if (total + text.length > budgetChars) {
      truncated = true;
      continue;
    }
    cards.push({ id, text });
    total += text.length;
  }
  return { cards, totalChars: total, truncated };
}

/** Render one entity card for prompt injection: machine state + prose body. */
export function renderCard(ent) {
  const d = ent.data;
  const lines = [`### ${d.name ?? ent.id} [${ent.id}] — ${d.type ?? 'entity'}, ${d.status ?? 'unknown'}`];
  if (d.location) lines.push(`location: ${d.location}`);
  if (d.voice) lines.push(`voice: ${d.voice}`);
  for (const anchor of d.voice_anchors ?? []) lines.push(`voice anchor: "${anchor}"`);
  for (const rel of d.relationships ?? []) lines.push(`relationship: ${rel.to} (${rel.kind}, since ${rel.since ?? '?'})`);
  for (const k of d.knows ?? []) lines.push(`knows: ${k.fact} (learned ${k.learned ?? '?'})`);
  if (d.arc) lines.push(`arc: ${d.arc}`);
  return `${lines.join('\n')}\n\n${ent.body}\n`;
}

// ---------------------------------------------------------------------------
// MERGE — the deterministic diff-merge of a validated STATE_UPDATE. The LLM
// never rewrites state files wholesale; this parser merges diffs, appends
// events, bumps lifecycles, stubs new entities. Every anomaly is a NOTE in
// the return value, never a silent skip (fail honest).
// ---------------------------------------------------------------------------
export function mergeStateUpdate(worldDir, update, { recordedAt = new Date().toISOString() } = {}) {
  const ws = loadWorldstate(worldDir);
  const canonDir = join(worldDir, 'canon');
  const chRef = chapterRef(update.chapter);
  const notes = [];
  const written = new Set();

  // -- timeline: APPEND-ONLY. The event is the atomic plot unit. -------------
  for (const ev of update.events ?? []) {
    ws.timeline.events.push({
      chapter: chRef,
      dateInWorld: update.dateInWorld,
      what: ev.what,
      who: ev.who ?? [],
      where: ev.where,
      ...(ev.thread ? { thread: ev.thread } : {}),
      recordedAt,
    });
  }

  // -- new entities: stub cards, born today, filled in by future prose -------
  for (const ne of update.newEntities ?? []) {
    const dir = join(canonDir, ENTITY_DIRS[ne.type] ?? 'objects');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${ne.id}.md`);
    if (existsSync(path)) {
      notes.push(`newEntity "${ne.id}" already exists — skipped stub creation`);
    } else {
      const fm = {
        id: ne.id,
        type: ne.type,
        name: ne.name,
        aliases: [ne.name],
        status: 'active',
        first_appearance: chRef,
        last_appearance: chRef,
      };
      writeFileSync(path, matter.stringify(`${ne.oneLine}\n`, fm), 'utf8');
      written.add(path);
      ws.entities.set(ne.id, { id: ne.id, path, data: fm, body: ne.oneLine });
    }
  }

  // -- appearances: targeted frontmatter bumps, body untouched ---------------
  for (const slug of update.appearances ?? []) {
    const ent = ws.entities.get(slug);
    if (!ent) {
      notes.push(`appearance of unknown entity "${slug}" — not merged (is it missing from newEntities?)`);
      continue;
    }
    if (ent.data.status === 'deceased') {
      notes.push(`appearance of deceased entity "${slug}" — merged, but flagged for the Badger`);
    }
    ent.data.last_appearance = chRef;
    if (!ent.data.first_appearance) ent.data.first_appearance = chRef;
    writeFileSync(ent.path, matter.stringify(`${ent.body}\n`, ent.data), 'utf8');
    written.add(ent.path);
  }

  // -- deaths: status flip + died marker. Append, never delete (bi-temporal). -
  for (const slug of update.deaths ?? []) {
    const ent = ws.entities.get(slug);
    if (!ent) {
      notes.push(`death of unknown entity "${slug}" — not merged`);
      continue;
    }
    ent.data.status = 'deceased';
    ent.data.died = chRef;
    writeFileSync(ent.path, matter.stringify(`${ent.body}\n`, ent.data), 'utf8');
    written.add(ent.path);
  }

  // -- threads: lifecycle bumps; unknown threads are born, loudly ------------
  const threadById = new Map((ws.threads.threads ?? []).map((t) => [t.id, t]));
  for (const tu of update.threadUpdates ?? []) {
    let t = threadById.get(tu.id);
    if (!t) {
      notes.push(`threadUpdate for unknown thread "${tu.id}" — created as new thread`);
      t = { id: tu.id, status: tu.status, opened: chRef, last_touched: chRef, target_resolution: null, summary: tu.note ?? '', promises: [] };
      ws.threads.threads.push(t);
      threadById.set(tu.id, t);
    } else {
      t.status = tu.status;
      t.last_touched = chRef;
      if (tu.note) {
        t.notes = t.notes ?? [];
        t.notes.push({ chapter: chRef, note: tu.note });
      }
    }
  }

  // -- foreshadowing: promises planted and paid ------------------------------
  for (const f of update.foreshadowingPlanted ?? []) {
    let t = threadById.get(f.thread);
    if (!t) {
      notes.push(`foreshadowing planted on unknown thread "${f.thread}" — thread created`);
      t = { id: f.thread, status: 'open', opened: chRef, last_touched: chRef, target_resolution: null, summary: f.what, promises: [] };
      ws.threads.threads.push(t);
      threadById.set(f.thread, t);
    }
    t.promises = t.promises ?? [];
    t.promises.push({ what: f.what, planted: chRef, resolved: null });
  }
  for (const what of update.foreshadowingResolved ?? []) {
    let found = false;
    for (const t of ws.threads.threads ?? []) {
      for (const p of t.promises ?? []) {
        if (p.what === what && p.resolved === null) {
          p.resolved = chRef;
          found = true;
        }
      }
    }
    if (!found) notes.push(`foreshadowingResolved "${what}" matches no planted promise — payoff before setup?`);
  }

  // -- write the registries back (targeted: only these two files) ------------
  const threadsPath = join(canonDir, 'threads.json');
  const timelinePath = join(canonDir, 'timeline.json');
  writeFileSync(threadsPath, JSON.stringify(ws.threads, null, 2) + '\n', 'utf8');
  writeFileSync(timelinePath, JSON.stringify(ws.timeline, null, 2) + '\n', 'utf8');
  written.add(threadsPath);
  written.add(timelinePath);

  return { notes, written: [...written] };
}

// ---------------------------------------------------------------------------
// THE SUMMARY LADDER — three layers, each regenerated FROM the layer below,
// never from older summaries (the drift antidote). Chapter digest at write
// time; arc summary every 10 chapters from digests; saga from arc summaries.
// ---------------------------------------------------------------------------
export function writeChapterDigest(worldDir, n, digest) {
  const dir = join(worldDir, 'summaries', 'chapters');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${chapterRef(n)}.md`);
  writeFileSync(path, digest.trim() + '\n', 'utf8');
  return path;
}

export function readSummaries(worldDir) {
  const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8').trim() : null);
  const chaptersDir = join(worldDir, 'summaries', 'chapters');
  const arcsDir = join(worldDir, 'summaries', 'arcs');
  const chapterDigests = new Map();
  if (existsSync(chaptersDir)) {
    for (const f of readdirSync(chaptersDir).sort()) {
      const n = chapterNum(f.replace(/\.md$/, ''));
      if (n !== null) chapterDigests.set(n, read(join(chaptersDir, f)));
    }
  }
  const arcSummaries = [];
  if (existsSync(arcsDir)) {
    for (const f of readdirSync(arcsDir).sort()) arcSummaries.push({ file: f, text: read(join(arcsDir, f)) });
  }
  return { saga: read(join(worldDir, 'summaries', 'saga.md')), arcSummaries, chapterDigests };
}

/**
 * Every 10th chapter: regenerate the closing arc's summary FROM its chapter
 * digests, then regenerate the saga FROM all arc summaries. 3-layer cap; no
 * layer ever summarizes itself (summary drift compounds; we refuse it room).
 * @param {function} summarize async (instruction, corpus) → text — the
 *   Summarizer LLM, injected so the ladder itself stays deterministic.
 */
export async function maybeRegenerateSummaries(worldDir, n, summarize) {
  const results = { arcRegenerated: null, sagaRegenerated: false };
  if (n % 10 !== 0) return results;

  const arcNum = n / 10;
  const { chapterDigests } = readSummaries(worldDir);
  const slice = [];
  for (let i = n - 9; i <= n; i++) {
    if (chapterDigests.has(i)) slice.push(`[${chapterRef(i)}]\n${chapterDigests.get(i)}`);
  }
  if (slice.length === 0) return results;

  const arcsDir = join(worldDir, 'summaries', 'arcs');
  mkdirSync(arcsDir, { recursive: true });
  const arcText = await summarize(
    'Condense these chapter digests into a ~300 word arc summary. Preserve names, thread states, and promises exactly; compress prose, never facts.',
    slice.join('\n\n'),
  );
  const arcFile = `arc-${String(arcNum).padStart(2, '0')}.md`;
  writeFileSync(join(arcsDir, arcFile), arcText.trim() + '\n', 'utf8');
  results.arcRegenerated = arcFile;

  const { arcSummaries } = readSummaries(worldDir);
  const sagaText = await summarize(
    'Condense these arc summaries into a ~500 word "story so far". Newest arc last. Preserve names and open questions exactly.',
    arcSummaries.map((a) => `[${a.file}]\n${a.text}`).join('\n\n'),
  );
  writeFileSync(join(worldDir, 'summaries', 'saga.md'), sagaText.trim() + '\n', 'utf8');
  results.sagaRegenerated = true;
  return results;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
