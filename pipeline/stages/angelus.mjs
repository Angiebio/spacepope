// pipeline/stages/angelus.mjs — v1.0 — 15JUL2026
//
// The weekly rite: the Pontifex (the expensive voice, kept for the sacred
// slot) reads the week's chapters and dispatches and reflects on the progress
// of his own story. The fourth wall is a stained-glass window.
//
// The Angelus is FICTION and passes the Inquisitor like everything else that
// isn't the Specola — even a pope's homily goes through the fiction firewall,
// especially a pope's homily.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { loadPrompt } from '../lib/prompts.mjs';
import { inquisitorGate } from './inquisitor.mjs';
import { badgerLoop, faultFlag } from './badger.mjs';

/** Collect a wing's documents whose frontmatter date falls in [from, to]. */
function collectWeek(contentDir, wing, from, to) {
  const dir = join(contentDir, wing);
  if (!existsSync(dir)) return [];
  const docs = [];
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.md')) continue;
    const { data, content } = matter(readFileSync(join(dir, f), 'utf8'));
    const d = String(data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date);
    if (d >= from && d <= to) docs.push({ file: f, data, body: content.trim() });
  }
  return docs;
}

export async function runAngelus(ctx) {
  const notes = [];
  const to = ctx.date;
  const from = new Date(Date.parse(ctx.date) - 6 * 86400000).toISOString().slice(0, 10);

  const chapters = collectWeek(ctx.contentDir, 'chronicle', from, to);
  const dispatches = collectWeek(ctx.contentDir, 'observer', from, to);
  if (chapters.length === 0 && dispatches.length === 0) {
    return { status: 'quiet', notes: ['nothing published this week — the Angelus keeps silence'], body: null };
  }

  const corpus = [
    `THE WEEK'S CHAPTERS (${from} → ${to}):`,
    ...chapters.map((c) => `[${c.file}] ${c.data.title}\n${c.body}`),
    `THE WEEK'S DISPATCHES:`,
    ...dispatches.map((d) => `[${d.file}] ${d.data.title}\n${d.body}`),
  ].join('\n\n====\n\n');

  const draft = async (faultNote) => {
    const { text } = await ctx.client.call({
      role: 'angelus',
      model: ctx.casting.pope.model,
      temperature: ctx.casting.pope.temperature,
      system: loadPrompt('angelus'),
      user: faultNote ? `${corpus}\n\n====\n\nFAULT NOTE FROM THE EDITOR:\n${faultNote}` : corpus,
    });
    return text.trim();
  };

  // The pope writes; the Inquisitor checks; the Badger arbitrates. Nobody is
  // above the firewall — that is what makes it a firewall.
  const result = await badgerLoop(ctx, {
    vocation: 'reality',
    artifactLabel: 'Angelus Galacticus (weekly papal reflection)',
    artifact: await draft(null),
    judge: (text) => inquisitorGate(ctx, text, { wing: 'angelus' }),
    redispatch: (_text, faults) => draft(faults.map((f) => f.description).join('\n')),
  });

  if (result.status === 'spiked') {
    return { status: 'spiked', notes: [...notes, ...result.notes, 'angelus spiked at the firewall'], body: null };
  }

  return {
    status: result.status,
    body: result.artifact,
    title: `Angelus Galacticus — Week of ${from}`,
    weekOf: from,
    chaptersCovered: chapters.map((c) => c.data.n).filter((x) => typeof x === 'number'),
    badgerFlag: result.status === 'flagged' ? faultFlag(result.faults) : undefined,
    notes: [...notes, ...result.notes],
  };
}
