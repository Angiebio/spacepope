// pipeline/lib/press.mjs — v1.2 — 18JUL2026 (beat-aware: writeLazaretto + writeRounds for the body-beat)
//
// The press room: the only door through which anything reaches content/.
// Every writer here emits frontmatter that satisfies src/content.config.ts
// EXACTLY — the site's zod schemas are the contract at the border, and a
// schism between pipeline and site should be impossible to commit, not merely
// unlikely. If the site's schema changes, this file changes in the same
// commit, or the build fails loudly at the door of the church (as intended).
//
// Ecclesiastically: the pressmen do not editorialize. They set the type the
// gates approved, stamp the colophon (Nihil Obstat, Imprimatur, or the honest
// badgerFlag), and pull the lever. Filenames are liturgy too:
// YYYY-MM-DD-slug.md for the dated wings, ch-NNN.md for the Chronicle.

import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

/** Map a fal content-type to the file extension the darkroom will re-encode from. */
function extForContentType(contentType = 'image/jpeg') {
  if (/png/i.test(contentType)) return 'png';
  if (/webp/i.test(contentType)) return 'webp';
  return 'jpg';
}

/**
 * The darkroom's own door: write an illuminated plate's bytes into the site's
 * asset tree (src/assets/illustrations/ in production, a sandbox in rehearsal).
 * Filenames match the content slug so a human can pair a picture to its piece
 * at a glance. Returns the bare filename to store in frontmatter — the site's
 * import.meta.glob resolves it to a hashed, re-encoded webp at build time, so
 * the pipeline commits the source plate and the darkroom does the rest.
 */
export function writeIllustration(assetsDir, { slug, bytes, contentType = 'image/jpeg' }) {
  mkdirSync(assetsDir, { recursive: true });
  const filename = `${slugify(slug, 80)}.${extForContentType(contentType)}`;
  writeFileSync(join(assetsDir, filename), bytes);
  return filename;
}

/** kebab-case a title into a filename-safe slug. */
export function slugify(title, maxLen = 60) {
  return String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
}

/** Prune undefined values so optional frontmatter keys are absent, not null. */
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

function writeDoc(dir, filename, frontmatter, body) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(path, matter.stringify(`\n${body.trim()}\n`, frontmatter), 'utf8');
  return path;
}

/** Bulletin of the Specola Galactica — the factual wing (§0.1a). */
export function writeSpecola(contentDir, { title, date, storyId, citations, stamps = {}, body }) {
  return writeDoc(
    join(contentDir, 'specola'),
    `${date}-${slugify(title)}.md`,
    clean({ title, date, storyId, citations, stamps: clean(stamps) }),
    body,
  );
}

/** The Galactic Observer — the satirical dispatch with cardinal commentary. */
export function writeObserver(contentDir, { title, date, storyIds, cardinal, see, model, illustration, illustrationAlt, stamps = {}, body }) {
  return writeDoc(
    join(contentDir, 'observer'),
    `${date}-${slugify(title)}.md`,
    clean({ title, date, storyIds, cardinal, see, model, illustration, illustrationAlt, stamps: clean(stamps) }),
    body,
  );
}

/** Bulletin of the Lazaretto — the med/biotech factual wing (§0.1a, canon §5b).
    A body-beat mirror of the Specola: same telescope discipline, different sky.
    Quarantined by rite into content/lazaretto so sky-news and body-news never
    share a shelf. Matches the `lazaretto` collection in src/content.config.ts. */
export function writeLazaretto(contentDir, { title, date, storyId, citations, stamps = {}, body }) {
  return writeDoc(
    join(contentDir, 'lazaretto'),
    `${date}-${slugify(title)}.md`,
    clean({ title, date, storyId, citations, stamps: clean(stamps) }),
    body,
  );
}

/** The Archiater's Rounds — Cardinal Galeno's ward-notes, the Lazaretto's
    counterpart to the Observer's Dispatch. One physician, always Galeno, so
    there is no `see`-bidding byline — the cardinal is fixed. A fiction wing, so
    it may carry an Illuminator plate. Matches the `rounds` collection. */
export function writeRounds(contentDir, { title, date, storyIds, cardinal, model, illustration, illustrationAlt, stamps = {}, body }) {
  return writeDoc(
    join(contentDir, 'rounds'),
    `${date}-${slugify(title)}.md`,
    clean({ title, date, storyIds, cardinal, model, illustration, illustrationAlt, stamps: clean(stamps) }),
    body,
  );
}

/** A chapter of the Chronicle of the Communion. Filename is ch-NNN.md. */
export function writeChronicle(contentDir, { n, title, date, kind, dispatchRef, threadsTouched = [], wordCount, illustration, illustrationAlt, stamps = {}, body }) {
  return writeDoc(
    join(contentDir, 'chronicle'),
    `ch-${String(n).padStart(3, '0')}.md`,
    clean({ n, title, date, kind, dispatchRef, threadsTouched, wordCount, illustration, illustrationAlt, stamps: clean(stamps) }),
    body,
  );
}

/** The Angelus Galacticus — weekly papal reflection. */
export function writeAngelus(contentDir, { title, date, weekOf, chaptersCovered = [], videoUrl, stamps = {}, body }) {
  return writeDoc(
    join(contentDir, 'angelus'),
    `${date}-${slugify(title)}.md`,
    clean({ title, date, weekOf, chaptersCovered, videoUrl, stamps: clean(stamps) }),
    body,
  );
}

/**
 * Acta Diurna — the run-log, published as JSON. The machinery is visible on
 * purpose: every stage, every verdict, every retry, and the day's total wage.
 */
export function writeActa(contentDir, { runId, date, status, stages, totalCostUsd }) {
  const dir = join(contentDir, 'acta');
  mkdirSync(dir, { recursive: true });
  // Filename keys off runId, not date: the Sunday Angelus run must not
  // overwrite the same Sunday's daily run-log.
  const path = join(dir, `${runId}.json`);
  const doc = clean({
    runId,
    date,
    status,
    stages: stages.map((s) => clean({ retries: 0, ...s })),
    totalCostUsd: totalCostUsd !== undefined ? round6(totalCostUsd) : undefined,
  });
  writeFileSync(path, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  return path;
}

/** Read a run's published Acta if it exists — the same-day double-publish tripwire. */
export function readActa(contentDir, runId) {
  const path = join(contentDir, 'acta', `${runId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Next chapter number = highest ch-NNN on the shelf + 1.
 * Empty shelf → ch-001: the seed worldstate's ch-001 references are
 * forward-looking (the founding chapter is the first one written).
 */
export function nextChapterNumber(contentDir) {
  const dir = join(contentDir, 'chronicle');
  if (!existsSync(dir)) return 1;
  let max = 0;
  for (const f of readdirSync(dir)) {
    const m = /^ch-(\d+)\.md$/.exec(f);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function round6(x) {
  return Math.round(x * 1e6) / 1e6;
}
