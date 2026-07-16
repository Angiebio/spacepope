#!/usr/bin/env node
// pipeline/liveness.mjs — v1.0 — 15JUL2026
//
// The weekly roll call. Model slugs are PINNED (a silent model swap changes a
// character's voice overnight), which means a model can silently vanish from
// the provider's catalog instead — so once a week we call the roll. A cast
// member that no longer answers means that See is sede vacante, and the
// workflow opens an issue titled accordingly so a human can reseat the chair.
//
// Exit codes: 0 = full college; 1 = at least one vacant see (details on
// stdout as JSON, one line per missing member, for the workflow to parse).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from './lib/openrouter.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Gather every pinned slug with the character(s) depending on it. */
export function castRoster(casting) {
  const roster = new Map(); // model → [names]
  const add = (model, name) => {
    if (!roster.has(model)) roster.set(model, []);
    roster.get(model).push(name);
  };
  for (const [role, cfg] of Object.entries(casting.crew)) add(cfg.model, `crew: ${role}`);
  for (const [slug, cfg] of Object.entries(casting.college)) add(cfg.model, cfg.name ?? slug);
  add(casting.pope.model, casting.pope.name);
  return roster;
}

export async function checkCast({ client, casting }) {
  const roster = castRoster(casting);
  const { missing } = await client.checkLiveness([...roster.keys()]);
  return missing.map((model) => ({ model, members: roster.get(model) }));
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const casting = JSON.parse(readFileSync(join(HERE, 'casting.json'), 'utf8'));
  const client = createClient({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });
  checkCast({ client, casting })
    .then((vacant) => {
      if (vacant.length === 0) {
        console.log('[liveness] the full college answers the bell.');
        process.exit(0);
      }
      for (const v of vacant) {
        // One JSON line per vacancy — the workflow turns each into an issue.
        console.log(JSON.stringify({ sedeVacante: v.members.join(', '), model: v.model }));
      }
      process.exit(1);
    })
    .catch((err) => {
      console.error(`[liveness] roll call failed: ${err.message}`);
      process.exit(2);
    });
}
