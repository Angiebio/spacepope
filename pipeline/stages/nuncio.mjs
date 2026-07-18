// pipeline/stages/nuncio.mjs — v1.2 — 18JUL2026 (beat-aware: reads its own beat's ledger + suggestion box)
//
// Stage 1: the Nuncio. The deterministic half (feeds.mjs) rides out and
// gathers; the LLM half only ranks what was gathered. The Nuncio cannot
// invent a story, because the Editor only accepts storyIds that the courier
// bag actually contains — hallucinated news dies at this desk, by arithmetic.
//
// A thin courier bag is not a failure: fewer viable stories than the
// quiet-day threshold means the communion simply has a quiet day, honestly.

import { gatherStories, loadCoveredLedger, filterCovered, loadSuggestions } from '../lib/feeds.mjs';
import { loadPrompt } from '../lib/prompts.mjs';
import { NUNCIO_SELECTION } from '../lib/schemas.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PIPELINE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function runNuncio(ctx) {
  const notes = [];

  // -- deterministic gather (or the canned courier bag, offline) -------------
  let stories;
  if (ctx.fixtures) {
    stories = ctx.fixtures.news.stories;
    notes.push(`fixtures mode: ${stories.length} canned stories`);
  } else {
    // The Showrunner's suggestion box rides in as Tier 0 (additive, boosted, still gated).
    // Beat-scoped: the body-beat never inherits the sky-beat's editorial picks
    // (a missing box is simply an empty box).
    const suggestions = loadSuggestions(join(PIPELINE_DIR, ctx.beat.suggestionsFile));
    const gathered = await gatherStories({ sources: ctx.sources, fetchImpl: ctx.fetchImpl, now: ctx.now, env: ctx.env, suggestions });
    stories = gathered.stories;
    notes.push(...gathered.notes);
  }

  // -- the Nuncio reads its own newspaper before riding out ------------------
  // RSS criers repeat themselves for days; the archive is the memory that
  // stops the wing from solemnly reporting the same story twice (17JUL2026).
  // Beat-scoped: each beat reads ONLY its own factual archive, so the body-beat
  // never dedupes a medtech story against a sky-beat bulletin (canon §5b: the
  // two orders share no ledger).
  const ledger = loadCoveredLedger(join(ctx.contentDir, ctx.beat.factualCollection));
  const { fresh, covered } = filterCovered(stories, ledger);
  if (covered.length > 0) {
    notes.push(`${covered.length} gathered stories already covered by the Specola — excluded: ${covered.map((s) => `"${s.title}"`).join(', ')}`);
  }
  stories = fresh;

  const { quietDayThreshold, min, max } = ctx.sources.selection;
  if (stories.length < quietDayThreshold) {
    notes.push(`only ${stories.length} candidate stories — quiet day declared before ranking`);
    return { stories, selected: [], quietDay: true, notes };
  }

  // -- LLM ranks; the Editor verifies every claimed id against the bag -------
  // Editorially-suggested stories are marked so the ranker gives them due
  // weight; the ranker still chooses, and the gates downstream still gate.
  const candidates = stories.slice(0, 20).map((s) => ({
    storyId: s.storyId,
    title: s.title,
    sources: s.sources,
    points: s.points,
    summary: s.summary,
    ...(s.suggested ? { editoriallySuggested: true, editorNote: s.note || undefined } : {}),
  }));
  const { json } = await ctx.client.call({
    role: 'nuncio',
    model: ctx.casting.crew.nuncio.model,
    temperature: ctx.casting.crew.nuncio.temperature,
    system: loadPrompt('nuncio'),
    user: `Today's gathered candidates (select ${min}-${max}):\n${JSON.stringify(candidates, null, 2)}`,
    schema: NUNCIO_SELECTION,
  });

  const byId = new Map(stories.map((s) => [s.storyId, s]));
  const selected = [];
  for (const pick of json.selected) {
    const story = byId.get(pick.storyId);
    if (!story) {
      notes.push(`nuncio selected unknown storyId "${pick.storyId}" — discarded (no invented news)`);
      continue;
    }
    if (selected.length >= max) {
      notes.push(`nuncio over-selected; truncated at ${max}`);
      break;
    }
    selected.push({ ...story, headline: pick.headline, whyItMatters: pick.whyItMatters });
  }

  const quietDay = selected.length < quietDayThreshold;
  if (quietDay) notes.push(`only ${selected.length} viable selections — quiet day declared`);
  return { stories, selected, quietDay, notes, reasoning: json.reasoning };
}
