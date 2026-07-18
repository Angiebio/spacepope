// tests/illustration/e2e.mjs — prove the whole chain on real content (not a unit test)
//
// prompt → fal → download → writeIllustration (real src/assets) → frontmatter →
// (then `npm run build` renders it). Runs the ACTUAL runIlluminator + press helper,
// so a green screenshot proves the production path, not a mock of it.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { createFalClient } from '../../pipeline/lib/fal.mjs';
import { runIlluminator } from '../../pipeline/stages/illuminator.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const ASSETS = join(REPO, 'src', 'assets', 'illustrations');

const FAL_KEY = (readFileSync('c:/Users/Zapper/OneDrive/Desktop/Flamekeeper/therealcat-flamekeeper/.env', 'utf8')
  .match(/^FAL_KEY=(.+)$/m)?.[1] ?? '').trim();
if (!FAL_KEY) throw new Error('FAL_KEY not found');

const falClient = createFalClient({ apiKey: FAL_KEY });
const ctx = { falClient, assetsDir: ASSETS };

// (contentRelPath, wing, slug) — slug mirrors what run.mjs would compute.
const targets = [
  ['content/observer/2026-07-18-dispatch-of-2026-07-18-news-from-the-sees.md', 'observer', '2026-07-18-dispatch-of-2026-07-18-news-from-the-sees'],
  ['content/chronicle/ch-004.md', 'chronicle', 'ch-004'],
];

for (const [rel, wing, slug] of targets) {
  const path = join(REPO, rel);
  const parsed = matter(readFileSync(path, 'utf8'));
  const title = parsed.data.title;
  console.log(`\nilluminating ${wing}: "${title}"`);
  const art = await runIlluminator(ctx, { slug, title, body: parsed.content, wing });
  console.log('  →', art.notes.join(' | '));
  if (!art.illustration) { console.log('  (no plate — leaving frontmatter untouched)'); continue; }
  parsed.data.illustration = art.illustration;
  parsed.data.illustrationAlt = art.illustrationAlt;
  writeFileSync(path, matter.stringify(parsed.content, parsed.data), 'utf8');
  console.log(`  stamped ${rel} with illustration: ${art.illustration}`);
}
console.log(`\ntotal wage: $${falClient.ledger.totalUsd}`);
