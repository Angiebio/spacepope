// pipeline/stages/astronomer.mjs — v1.0 — 15JUL2026
//
// Stage 2: the Astronomer of the Specola. The factual wing (§0.1a): real
// names required, satire forbidden. The LLM writes only the prose body;
// title and citations are set deterministically from the courier bag —
// a citation invented by a mind is not a citation, it is a fever-vision,
// and the telescope log does not run fevers.

import { loadPrompt } from '../lib/prompts.mjs';

/** Draft one bulletin (used both fresh and on badger redispatch). */
export async function draftBulletin(ctx, story, faultNote = null) {
  const user = [
    `STORY MATERIAL:\n${JSON.stringify({
      headline: story.headline ?? story.title,
      originalTitle: story.title,
      url: story.url,
      sources: story.sources,
      publishedAt: story.publishedAt,
      summary: story.summary,
      whyItMatters: story.whyItMatters,
    }, null, 2)}`,
    faultNote ? `FAULT NOTE FROM THE EDITOR (previous draft rejected):\n${faultNote}` : null,
  ].filter(Boolean).join('\n\n');

  const { text } = await ctx.client.call({
    role: 'astronomer',
    model: ctx.casting.crew.astronomer.model,
    temperature: ctx.casting.crew.astronomer.temperature,
    system: loadPrompt('astronomer'),
    user,
  });
  return text.trim();
}

export async function runAstronomer(ctx, { selected }) {
  const bulletins = [];
  for (const story of selected) {
    const body = await draftBulletin(ctx, story);
    bulletins.push({
      storyId: story.storyId,
      title: story.headline ?? story.title,
      body,
      // Deterministic citations: the real URL the couriers actually carried.
      citations: [{ title: story.title, url: story.url, source: story.sources[0] ?? 'unknown' }],
      story, // kept for the Censor's source-material check and redispatches
    });
  }
  return { bulletins };
}
