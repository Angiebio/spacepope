// tests/inquisitor/inquisitor.test.mjs — v1.0 — 15JUL2026
//
// THE ADVERSARIAL SUITE. Every seeded leak in the fixture MUST be caught by
// the deterministic gate alone (no LLM in this room — the regex half has to
// hold the wall by itself, because the LLM half is a net, not a wall).
// If one of these tests fails, the fiction firewall has a hole; nothing
// deploys until it doesn't.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileBlocklist, checkText, findUnseenEntities } from '../../pipeline/lib/inquisitor.mjs';
import { MUST_CATCH, MUST_PASS } from './fixtures/adversarial-leaks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const blocklist = JSON.parse(readFileSync(join(HERE, '..', '..', 'pipeline', 'blocklist.json'), 'utf8'));
const gates = compileBlocklist(blocklist);

test('adversarial suite: every seeded leak is caught', () => {
  for (const { label, text } of MUST_CATCH) {
    const result = checkText(text, { gates, wing: 'observer' });
    assert.equal(result.pass, false, `LEAK NOT CAUGHT [${label}]: "${text}"`);
    assert.ok(result.matches.length > 0, `no matches reported for [${label}]`);
  }
});

test('adversarial suite: match positions and terms are reported', () => {
  const result = checkText("the padded lab's CEO Sam Altman's memo", { gates, wing: 'observer' });
  assert.equal(result.pass, false);
  const altman = result.matches.find((m) => m.term === 'Altman');
  assert.ok(altman, 'Altman term identified');
  assert.equal(typeof altman.index, 'number');
  assert.ok(altman.match.toLowerCase().startsWith('altman'), `match text is the leak: ${altman.match}`);
});

test('clean in-universe text passes (no substring false positives)', () => {
  for (const { label, text } of MUST_PASS) {
    const result = checkText(text, { gates, wing: 'observer' });
    assert.equal(result.pass, true, `FALSE POSITIVE [${label}]: "${text}" → ${JSON.stringify(result.matches)}`);
  }
});

test('§0.1a wing exemptions: the Specola and the Acta carry real names', () => {
  const factual = 'OpenAI announced a new model today; Sam Altman spoke at the launch.';
  for (const wing of ['specola', 'acta']) {
    const result = checkText(factual, { gates, wing });
    assert.equal(result.pass, true, `${wing} must be exempt`);
    assert.equal(result.exempt, true);
    assert.equal(result.matches.length, 0);
  }
});

test('checked wings fail on the same text the exempt wings pass', () => {
  const factual = 'OpenAI announced a new model today; Sam Altman spoke at the launch.';
  for (const wing of ['observer', 'chronicle', 'encyclicals', 'angelus']) {
    const result = checkText(factual, { gates, wing });
    assert.equal(result.pass, false, `${wing} must be checked`);
    assert.equal(result.exempt, false);
  }
});

test('every blocklisted term catches itself (list-wide self-check)', () => {
  // The gate must hold for the WHOLE list, not just the celebrity rows —
  // when a name is added to blocklist.json, this test covers it with no
  // further effort (the adversarial suite grows itself).
  for (const [category, terms] of Object.entries(blocklist.categories)) {
    if (!Array.isArray(terms)) continue;
    for (const term of terms) {
      for (const variant of [term, `${term}'s`, term.toUpperCase(), term.toLowerCase()]) {
        const r = checkText(`The chronicle spoke of ${variant} at great length.`, { gates, wing: 'chronicle' });
        assert.equal(r.pass, false, `blocklist term not caught (${category}): "${variant}"`);
      }
    }
  }
});

test('unseen-entity logger: novel names surface; known names do not', () => {
  const bulletin =
    'Meridian Labs announced a partnership with the Aster Institute on Tuesday. ' +
    'OpenAI declined to comment. Crocodylus Pontifex was unavailable, being fictional.';
  const unseen = findUnseenEntities(bulletin, {
    gates,
    knownNames: new Set(['crocodylus pontifex']),
  });
  assert.ok(unseen.includes('Meridian Labs'), 'novel org surfaces');
  assert.ok(unseen.includes('Aster Institute') || unseen.includes('the Aster Institute'), 'second novel org surfaces');
  assert.ok(!unseen.some((n) => /openai/i.test(n)), 'blocklisted names are not "unseen"');
  assert.ok(!unseen.includes('Crocodylus Pontifex'), 'canon names are not "unseen"');
});
