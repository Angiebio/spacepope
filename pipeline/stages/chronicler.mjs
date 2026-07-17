// pipeline/stages/chronicler.mjs — v1.0 — 15JUL2026
//
// Stage 8: the Chronicler — the novel's daily desk, run per ROADMAP-03 §2:
// LINT (deterministic, already priceless) → PLAN (just-in-time beats, DOME
// pattern) → WRITE (~1000 words + the STATE_UPDATE block in the same breath).
// Context is assembled per the lost-in-the-middle findings (§3): saga at the
// TOP, entity cards and lint findings near the END, where attention actually
// lands. Retrieval scans the chapter PLAN, not history.
//
// State capture at WRITE time is the covenant: the chapter tells the archive
// what happened while the ink is wet, because nobody — human or grown —
// should be trusted to re-read their own prose and testify accurately later.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { loadPrompt } from '../lib/prompts.mjs';
import { CHAPTER_PLAN, STATE_UPDATE } from '../lib/schemas.mjs';
import { validateSchema } from '../lib/validate.mjs';
import {
  loadWorldstate, lintWorldstate, injectCards, readSummaries, chapterRef,
} from '../lib/worldstate.mjs';
import { nextChapterNumber } from '../lib/press.mjs';
import { badgerRuling } from './badger.mjs';
import { inquisitorGate } from './inquisitor.mjs';

/**
 * Split a draft into prose + validated STATE_UPDATE.
 * The block is fenced ```state_update (```json tolerated); the LAST fenced
 * block in the draft is the one that counts.
 * @returns {{prose, update, errors}} errors non-empty = the draft owes a retry.
 */
export function parseStateUpdate(text) {
  const re = /```(?:state_update|json)\s*\n([\s\S]*?)```/g;
  let match = null;
  let m;
  while ((m = re.exec(text)) !== null) match = m;
  if (!match) return { prose: text.trim(), update: null, errors: ['no fenced state_update block found'] };

  const prose = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim();
  let update;
  try {
    update = JSON.parse(match[1]);
  } catch (e) {
    return { prose, update: null, errors: [`state_update block is not JSON: ${e.message}`] };
  }
  const errors = validateSchema(update, STATE_UPDATE.schema);
  return { prose, update: errors.length ? null : update, errors };
}

export function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Read the previous chapter's body verbatim (frontmatter stripped). */
function lastChapterVerbatim(contentDir, n) {
  if (n <= 1) return null;
  const path = join(contentDir, 'chronicle', `${chapterRef(n - 1)}.md`);
  if (!existsSync(path)) return null;
  return matter(readFileSync(path, 'utf8')).content.trim();
}

/** Assemble the Writer's context per ROADMAP-03 §3 — order IS the design. */
function assembleContext({ summaries, contentDir, n, ws, plan, lintFindings, dispatch, quietDay }) {
  const parts = [];

  // TOP: the story so far — the widest lens first.
  if (summaries.saga) parts.push(`THE STORY SO FAR (saga):\n${summaries.saga}`);
  const lastArc = summaries.arcSummaries.at(-1);
  if (lastArc) parts.push(`CURRENT ARC SUMMARY (${lastArc.file}):\n${lastArc.text}`);

  // Last 2-3 chapter digests, oldest first.
  const digestNs = [...summaries.chapterDigests.keys()].filter((k) => k < n).sort((a, b) => a - b).slice(-3);
  for (const dn of digestNs) parts.push(`DIGEST ${chapterRef(dn)}:\n${summaries.chapterDigests.get(dn)}`);

  const verbatim = lastChapterVerbatim(contentDir, n);
  if (verbatim) parts.push(`LAST CHAPTER VERBATIM (${chapterRef(n - 1)}):\n${verbatim}`);

  if (dispatch && !quietDay) parts.push(`TODAY'S DISPATCH FROM THE WATER-WORLD:\n${dispatch.title}\n\n${dispatch.body}`);

  // NEAR THE END, where attention lands: cards, lint, beats.
  const scanText = [plan.beats.join('\n'), plan.threadsToTouch.join(' '), dispatch?.title ?? ''].join('\n');
  const { cards, truncated } = injectCards(ws, scanText);
  if (cards.length) {
    parts.push(`ENTITY CARDS (canonical; voice anchors are law${truncated ? '; some cards withheld for budget' : ''}):\n${cards.map((c) => c.text).join('\n---\n')}`);
  }
  if (lintFindings.length) {
    parts.push(`LINTER FINDINGS (the archive's open invoices):\n${lintFindings.map((f) => `- [${f.rule}] ${f.subject}: ${f.detail}`).join('\n')}`);
  }
  parts.push(`TODAY'S APPROVED PLAN (kind: ${plan.kind}):\nbeats:\n${plan.beats.map((b) => `- ${b}`).join('\n')}\nthreads to touch: ${plan.threadsToTouch.join(', ') || '(none)'}`);

  return { context: parts.join('\n\n====\n\n'), cards };
}

export async function runChronicler(ctx, { dispatch = null, quietDay = false }) {
  const notes = [];
  const ws = loadWorldstate(ctx.worldDir);
  const n = nextChapterNumber(ctx.contentDir);
  const lintFindings = lintWorldstate(ws, n);
  const summaries = readSummaries(ctx.worldDir);

  // ---- PLAN: just-in-time beat expansion ------------------------------------
  const threadBoard = (ws.threads.threads ?? [])
    .map((t) => `- ${t.id} [${t.status}, last ${t.last_touched}]: ${t.summary}`)
    .join('\n');
  const planUser = [
    quietDay ? 'THE EDITOR DECLARES A QUIET DAY: no dispatch today; plan an interstitial (kind MUST be "interstitial").' : null,
    summaries.saga ? `THE STORY SO FAR:\n${summaries.saga}` : 'THE STORY SO FAR: (the Chronicle opens today — this is the founding chapter)',
    `OPEN THREADS:\n${threadBoard || '(none)'}`,
    lintFindings.length ? `LINTER FINDINGS:\n${lintFindings.map((f) => `- [${f.rule}] ${f.subject}: ${f.detail}`).join('\n')}` : null,
    dispatch && !quietDay ? `TODAY'S DISPATCH:\n${dispatch.title}\n\n${dispatch.body}` : null,
    `You are planning chapter ${chapterRef(n)}.`,
  ].filter(Boolean).join('\n\n');

  const { json: planJson } = await ctx.client.call({
    role: 'chronicler-plan',
    model: ctx.casting.crew.chronicler.model,
    temperature: 0.6, // planning runs cooler than prose
    system: loadPrompt('chronicler-plan'),
    user: planUser,
    schema: CHAPTER_PLAN,
  });
  const plan = { ...planJson };
  if (quietDay && plan.kind !== 'interstitial') {
    notes.push('planner ignored quiet-day declaration — kind forced to interstitial');
    plan.kind = 'interstitial';
  }

  // ---- CONTEXT + DRAFT (retry ≤2 on malformed STATE_UPDATE) ------------------
  const { context, cards } = assembleContext({ summaries, contentDir: ctx.contentDir, n, ws, plan, lintFindings, dispatch, quietDay });
  const system = loadPrompt('chronicler-draft', { CHAPTER_REF: chapterRef(n), CHAPTER_NUM: n });
  const schemaNote = `The state_update JSON schema:\n${JSON.stringify(STATE_UPDATE.schema, null, 2)}`;

  const draftOnce = async (faultNote) => {
    const { text } = await ctx.client.call({
      role: 'chronicler-draft',
      model: ctx.casting.crew.chronicler.model,
      temperature: ctx.casting.crew.chronicler.temperature,
      system,
      user: [context, schemaNote, faultNote ? `FAULT NOTE FROM THE EDITOR (previous draft rejected):\n${faultNote}` : null]
        .filter(Boolean).join('\n\n====\n\n'),
    });
    return text;
  };

  let prose = null;
  let update = null;
  let faultNote = null;
  for (let attempt = 0; attempt <= 2; attempt++) {
    const raw = await draftOnce(faultNote);
    const parsed = parseStateUpdate(raw);
    if (parsed.update) {
      prose = parsed.prose;
      update = parsed.update;
      break;
    }
    faultNote = `your STATE_UPDATE block was rejected: ${parsed.errors.join('; ')}. Emit the complete chapter again, prose then a single \`\`\`state_update fenced JSON block.`;
    notes.push(`draft attempt ${attempt + 1}: malformed state_update (${parsed.errors.join('; ')})`);
  }
  if (!update) {
    // Duck doctrine: a chapter whose state can't be captured is a chapter the
    // archive cannot afford. Spike it; the Acta will say why.
    return { status: 'spiked', notes: [...notes, 'state_update unrecoverable after retries — chapter spiked'], n, plan, lintFindings };
  }
  if (update.chapter !== n) {
    notes.push(`chronicler numbered the chapter ${update.chapter}; corrected to ${n}`);
    update.chapter = n;
  }

  // ---- THE FICTION FIREWALL: the Chronicle is a checked wing ------------------
  // (blocklist.json: "observer, chronicle, encyclicals, angelus, commentary —
  // is checked"). A real name in the novel is a hard fail; the redraft
  // machinery is right here, so the gate runs here.
  for (let attempt = 0; ; attempt++) {
    const gate = await inquisitorGate(ctx, prose, { wing: 'chronicle' });
    if (gate.pass) break;
    if (attempt >= 2) {
      return { status: 'spiked', notes: [...notes, `chapter failed the fiction firewall after retries: ${gate.faults.map((f) => f.description).join('; ')}`], n, plan, lintFindings };
    }
    notes.push(`chapter hit the fiction firewall (attempt ${attempt + 1}): ${gate.faults.map((f) => f.description).join('; ')}`);
    const raw = await draftOnce(`the Inquisitor names these leaks — translate them into archetypes (Hard Rule §0.1):\n${gate.faults.map((f) => `- ${f.description}`).join('\n')}`);
    const parsed = parseStateUpdate(raw);
    if (parsed.update) {
      prose = parsed.prose;
      update = parsed.update;
      if (update.chapter !== n) update.chapter = n;
    } else {
      notes.push(`firewall redraft had malformed state_update — keeping previous draft (${parsed.errors.join('; ')})`);
    }
  }

  // ---- CONTINUITY BADGER (step 9): checks what the linter can't --------------
  const badgerContext = [
    `LINTER FINDINGS:\n${lintFindings.map((f) => `- [${f.rule}] ${f.subject}: ${f.detail}`).join('\n') || '(clean)'}`,
    `TRIGGERED ENTITY CARDS:\n${cards.map((c) => c.text).join('\n---\n') || '(none)'}`,
    `OPEN THREADS:\n${threadBoard || '(none)'}`,
  ].join('\n\n');

  let status = 'pass';
  let flagFaults = [];
  let retries = 0;
  for (;;) {
    const { ruling } = await badgerRuling(ctx, {
      vocation: 'continuity',
      artifactLabel: `chronicle chapter ${chapterRef(n)} (prose + state_update)`,
      artifact: `${prose}\n\nSTATE_UPDATE:\n${JSON.stringify(update, null, 2)}`,
      context: badgerContext,
    });
    if (ruling.verdict === 'pass') break;
    if (ruling.verdict === 'flag') {
      status = 'flagged';
      flagFaults = ruling.faults;
      notes.push('continuity badger flagged the chapter — publishing with visible fault');
      break;
    }
    if (ruling.verdict === 'spike') {
      return { status: 'spiked', notes: [...notes, `continuity badger spiked the chapter: ${ruling.faults.map((f) => f.description).join('; ')}`], n, plan, lintFindings };
    }
    // redispatch
    if (retries >= 2) {
      const mustFix = ruling.faults.some((f) => f.mustFix);
      if (mustFix) {
        return { status: 'spiked', notes: [...notes, 'continuity redispatch budget exhausted with mustFix faults — spiked'], n, plan, lintFindings };
      }
      status = 'flagged';
      flagFaults = ruling.faults;
      notes.push('continuity redispatch budget exhausted — publishing flagged');
      break;
    }
    retries++;
    notes.push(`continuity badger redispatch #${retries}: ${ruling.faults.map((f) => f.description).join('; ')}`);
    const raw = await draftOnce(`the continuity badger names these faults — fix them without breaking anything else:\n${ruling.faults.map((f) => `- ${f.description}`).join('\n')}`);
    const parsed = parseStateUpdate(raw);
    if (parsed.update) {
      prose = parsed.prose;
      update = parsed.update;
      if (update.chapter !== n) update.chapter = n;
    } else {
      notes.push(`redispatched draft had malformed state_update — keeping previous draft (${parsed.errors.join('; ')})`);
    }
  }

  // The chapter's name: the Planner titles its own work (schema-required),
  // with a word-boundary fallback from the first beat. Never cut mid-word —
  // the first published chapter of history lost "the Pontifex" to a blunt
  // slice(0,80) and shipped as "...to the P". Titles are not firewood.
  const titleAtWordBoundary = (s, max = 72) => {
    const clean = (s ?? '').replace(/\.$/, '').trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  };
  const title = plan.kind === 'interstitial'
    ? `A Quiet Day in the Communion`
    : (plan.title?.trim() || titleAtWordBoundary(plan.beats[0] ?? `Chapter ${n}`));

  return {
    status, n, title, prose, update, plan, lintFindings,
    kind: plan.kind,
    wordCount: countWords(prose),
    threadsTouched: (update.threadUpdates ?? []).map((t) => t.id),
    badgerFaults: flagFaults,
    retries,
    notes,
  };
}
