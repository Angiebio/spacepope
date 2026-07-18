// tests/illustration/illustration.test.mjs — v1.0 — 18JUL2026
//
// The scriptorium under test. Three covenants are checked here:
//   1. The fal client mirrors the openrouter shape: injectable transport, two
//      knocks (commission + download), honest throw on failure.
//   2. The Illuminator fails HONEST: no key or a fal error yields a null plate
//      and a logged note, and the piece is never blocked.
//   3. The border holds: un-illustrated fiction still validates the site schema
//      (proven at the pipeline door by the golden run; asserted structurally here).
//
// Zero network, zero spend — the transport is a mock, the fal client a fixture.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFalClient, createFixtureFalClient, FIXTURE_JPEG } from '../../pipeline/lib/fal.mjs';
import {
  runIlluminator, composeIlluminationPrompt, sceneSeedFromBody, HOUSE_STYLE,
} from '../../pipeline/stages/illuminator.mjs';

// A tiny transport recorder: canned responses in, calls captured out.
function mockTransport(steps) {
  const calls = [];
  let i = 0;
  return {
    calls,
    fetch: async (url, opts) => {
      calls.push({ url, opts });
      const step = steps[i++];
      if (typeof step === 'function') return step(url, opts);
      return step;
    },
  };
}
const jsonRes = (obj, ok = true, status = 200) => ({
  ok, status, json: async () => obj, text: async () => JSON.stringify(obj),
});
const bytesRes = (bytes, ok = true, status = 200, contentType = 'image/jpeg') => ({
  ok, status,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? contentType : null) },
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  text: async () => '',
});

// ---------------------------------------------------------------------------
test('fal client: two knocks (POST commission + GET download) return bytes + ledger', async () => {
  const t = mockTransport([
    jsonRes({ images: [{ url: 'https://fal.media/plate.jpg' }], seed: 42 }),
    bytesRes(FIXTURE_JPEG),
  ]);
  const fal = createFalClient({ apiKey: 'test-key', transport: t.fetch });
  const out = await fal.generateImage({ prompt: 'a saurian pontiff at a telescope' });

  assert.ok(out.bytes.length > 0, 'bytes came back');
  assert.equal(out.seed, 42);
  assert.equal(out.costUsd, 0.025, 'per-image wage recorded');
  assert.equal(fal.ledger.images, 1);
  assert.equal(fal.ledger.totalUsd, 0.025);

  // First knock: POST to the model, with the fal Key header + body.
  assert.match(t.calls[0].url, /fal-ai\/flux\/dev$/);
  assert.equal(t.calls[0].opts.method, 'POST');
  assert.match(t.calls[0].opts.headers.Authorization, /^Key /);
  const body = JSON.parse(t.calls[0].opts.body);
  assert.equal(body.image_size, 'landscape_16_9');
  assert.equal(body.prompt, 'a saurian pontiff at a telescope');
  // Second knock: GET the image url.
  assert.equal(t.calls[1].url, 'https://fal.media/plate.jpg');
});

test('fal client: honest throw when the commission fails (no silent blank canvas)', async () => {
  const t = mockTransport([jsonRes({ error: 'over budget' }, false, 402)]);
  const fal = createFalClient({ apiKey: 'k', transport: t.fetch });
  await assert.rejects(() => fal.generateImage({ prompt: 'x' }), /fal 402/);
  assert.equal(fal.ledger.images, 0, 'a failed commission costs nothing');
});

test('fal client: honest throw when the image download fails', async () => {
  const t = mockTransport([
    jsonRes({ images: [{ url: 'https://fal.media/gone.jpg' }] }),
    bytesRes(new Uint8Array(0), false, 404),
  ]);
  const fal = createFalClient({ apiKey: 'k', transport: t.fetch });
  await assert.rejects(() => fal.generateImage({ prompt: 'x' }), /download failed \(404\)/);
});

test('fal client: an empty prompt is refused before any wire is touched', async () => {
  const t = mockTransport([]);
  const fal = createFalClient({ apiKey: 'k', transport: t.fetch });
  await assert.rejects(() => fal.generateImage({ prompt: '   ' }), /empty prompt/);
  assert.equal(t.calls.length, 0, 'no knock on an empty prompt');
});

// ---------------------------------------------------------------------------
test('prompt derivation is deterministic and firewall-aware', () => {
  const body = '## A heading\n\nThe frog-cardinal rose in the wet chapel. Stars pressed the glass.\n\n---\n\n## Commentary — someone\n\nThis part must NOT leak into the prompt.';
  const seed = sceneSeedFromBody(body);
  assert.ok(seed.includes('frog-cardinal'), 'opening prose seeds the scene');
  assert.ok(!seed.includes('Commentary'), 'appended commentary is excluded');
  assert.ok(!seed.includes('##'), 'markdown furniture stripped');

  const p1 = composeIlluminationPrompt({ key: 'ch-002', title: 'The Wet Chapel', body });
  const p2 = composeIlluminationPrompt({ key: 'ch-002', title: 'The Wet Chapel', body });
  assert.equal(p1, p2, 'same input, same prompt — the spine has no temperature');
  assert.ok(p1.includes(HOUSE_STYLE), 'house style is welded on');
  assert.ok(p1.includes('The Wet Chapel'), 'title carried into the scene');
  assert.ok(/Do NOT arrange symmetrical rows/.test(p1), 'the anti-rows directive is present');
});

test('the shot rotation gives deterministic variety across pieces', () => {
  const shots = ['ch-001', 'ch-002', 'ch-003', 'ch-004', 'd-000', 'd-016', 'd-018']
    .map((k) => composeIlluminationPrompt({ key: k, title: 't', body: 'A moment.' }));
  // Same key is stable; the set of keys yields more than one distinct camera.
  const distinct = new Set(shots).size;
  assert.ok(distinct >= 3, `expected varied shots across pieces, got ${distinct} distinct`);
  assert.equal(
    composeIlluminationPrompt({ key: 'ch-001', title: 't', body: 'A moment.' }),
    composeIlluminationPrompt({ key: 'ch-001', title: 't', body: 'A moment.' }),
    'a given piece always gets the same shot',
  );
});

// ---------------------------------------------------------------------------
test('Illuminator FAIL HONEST: no fal client → null plate, logged note, piece survives', async () => {
  const ctx = { falClient: null, assetsDir: '/nowhere' };
  const out = await runIlluminator(ctx, { slug: 'ch-001', title: 'A Chapter', body: 'Prose.', wing: 'chronicle' });
  assert.equal(out.illustration, null, 'no plate');
  assert.equal(out.illustrationAlt, null);
  assert.equal(out.costUsd, 0);
  assert.match(out.notes.join(' '), /no FAL_KEY/, 'the reason is on the record');
});

test('Illuminator FAIL HONEST: fal throws → null plate, logged note, piece survives', async () => {
  const throwingFal = {
    ledger: { totalUsd: 0, images: 0 },
    generateImage: async () => { throw new Error('the well ran dry'); },
  };
  const dir = mkdtempSync(join(tmpdir(), 'illum-'));
  try {
    const out = await runIlluminator({ falClient: throwingFal, assetsDir: dir },
      { slug: 'ch-002', title: 'Another', body: 'Prose.', wing: 'chronicle' });
    assert.equal(out.illustration, null, 'no plate on error');
    assert.match(out.notes.join(' '), /the well ran dry/, 'fault named honestly');
    assert.equal(readdirSync(dir).length, 0, 'nothing written on failure');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Illuminator SUCCESS: writes a plate to assetsDir and returns filename + alt', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'illum-ok-'));
  try {
    const out = await runIlluminator(
      { falClient: createFixtureFalClient(), assetsDir: dir },
      { slug: 'ch-003', title: 'The Gilded Chapter', body: 'A frog-cardinal knelt.', wing: 'chronicle' },
    );
    assert.equal(out.illustration, 'ch-003.jpg', 'filename matches the slug');
    assert.ok(out.illustrationAlt.includes('Machine-generated'), 'alt labels the plate honestly');
    assert.ok(existsSync(join(dir, 'ch-003.jpg')), 'the plate landed on disk');
    assert.ok(readFileSync(join(dir, 'ch-003.jpg')).length > 0, 'the plate has bytes');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
