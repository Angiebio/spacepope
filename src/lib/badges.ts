// ==========================================================================
// spacepope.ai — lib/badges.ts · v1.1 — 17JUL2026
// --------------------------------------------------------------------------
// The heraldry office. Ace and the household hand-draw one badge per
// Cardinal (purple ring, transparent ground — the art direction is law:
// never a white circle, never a crop). This module is the single place the
// site asks "does this slug have a face yet?" so every page answers the
// same way. A Cardinal without a badge is not an error; they simply have
// not sat for their portrait, and the letter sigil keeps their seat warm.
// ==========================================================================
import type { ImageMetadata } from 'astro';
import popeBadge from '../assets/badge-silex-by-ace.png';

// Eager glob: the badges are build-time truth, exactly like casting.json.
// Filenames ARE the college slugs (the contract that makes lookup a key).
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/cardinals/*.png',
  { eager: true }
);

const bySlug: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const slug = path.split('/').pop()!.replace(/\.png$/, '');
  bySlug[slug] = mod.default;
}

// The Pontifex is not filed under cardinals/ (the Pontifex is what the
// College orbits) but the Atlas registry knows the id, so the office answers.
bySlug['silex'] = popeBadge;

/** The hand-drawn badge for a slug, or undefined if none has been drawn. */
export function badgeFor(slug: string): ImageMetadata | undefined {
  return bySlug[slug];
}
