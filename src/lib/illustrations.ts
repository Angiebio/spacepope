// ==========================================================================
// spacepope.ai — lib/illustrations.ts · v1.0 — 18JUL2026
// --------------------------------------------------------------------------
// The scriptorium's plate registry. The Illuminator (pipeline) commits one
// generated plate per illustrated fiction piece into assets/illustrations/,
// and stores the bare filename in frontmatter. This module is the single
// place the site asks "does this piece have a plate yet?", exactly as
// badges.ts answers for the Cardinals' faces. A piece without a plate is not
// an error: the scriptorium was dark that day, and the prose stands alone.
//
// EDITORIAL LAW: only the FICTION wings (observer, chronicle) ever carry a
// plate. The factual Specola is text and citations forever — illustrating
// real news is the very sin this publication satirizes.
// ==========================================================================
import type { ImageMetadata } from 'astro';

// Eager glob: the plates are build-time truth, like the hand-drawn badges.
// Filenames ARE the frontmatter keys (the contract that makes lookup a key).
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/illustrations/*.{jpg,jpeg,png,webp}',
  { eager: true }
);

const byName: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const name = path.split('/').pop()!;
  byName[name] = mod.default;
}

/** The generated plate for a frontmatter filename, or undefined if none exists. */
export function illustrationFor(filename?: string): ImageMetadata | undefined {
  if (!filename) return undefined;
  return byName[filename];
}
