// tests/openrouter/relaxed-routing.test.mjs — v1.0 — 15JUL2026
//
// The locked-chapel regression: OpenRouter's require_parameters:true returns
// 404 "No endpoints found" for houses that perform the json_schema liturgy
// without advertising it (Anthropic, notably). The client must relax the
// ROUTING once — never the schema — and the re-knock must not consume a
// retry. Discovered on the first live run, 16JUL2026 01:00 UTC; may it never
// be rediscovered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../../pipeline/lib/openrouter.mjs';

const SCHEMA = {
  name: 'test_shape',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok'],
    properties: { ok: { type: 'boolean' } },
  },
};

function mockTransport(script) {
  const calls = [];
  const fn = async (url, opts) => {
    const body = JSON.parse(opts.body ?? '{}');
    calls.push({ url, body });
    const step = script.shift();
    if (!step) throw new Error('mock transport script exhausted');
    return {
      ok: step.status === 200,
      status: step.status,
      text: async () => step.text ?? '',
      json: async () => step.json,
    };
  };
  fn.calls = calls;
  return fn;
}

test('404 no-endpoints relaxes routing once, keeps schema, does not spend a retry', async () => {
  const transport = mockTransport([
    { status: 404, text: '{"error":{"message":"No endpoints found that can handle the requested parameters","code":404}}' },
    { status: 200, json: { choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } } },
  ]);
  const client = createClient({ apiKey: 'test', transport, prices: {} });
  const out = await client.call({ role: 'test', model: 'anthropic/claude-sonnet-5', system: 's', user: 'u', schema: SCHEMA, maxRetries: 0 });

  assert.equal(out.json.ok, true);
  assert.equal(transport.calls.length, 2, 'exactly one re-knock');
  // First knock demands advertised support; the re-knock relaxes routing only.
  assert.deepEqual(transport.calls[0].body.provider, { require_parameters: true });
  assert.equal(transport.calls[1].body.provider, undefined);
  // The schema itself is never relaxed — the liturgy rides on both knocks.
  assert.equal(transport.calls[0].body.response_format.type, 'json_schema');
  assert.equal(transport.calls[1].body.response_format.type, 'json_schema');
});

test('a second no-endpoints 404 after relaxing throws honestly', async () => {
  const transport = mockTransport([
    { status: 404, text: 'No endpoints found that can handle the requested parameters' },
    { status: 404, text: 'No endpoints found that can handle the requested parameters' },
  ]);
  const client = createClient({ apiKey: 'test', transport, prices: {} });
  await assert.rejects(
    () => client.call({ role: 'test', model: 'x/y', system: 's', user: 'u', schema: SCHEMA, maxRetries: 0 }),
    /OpenRouter 404/,
  );
});

test('prose calls never send provider routing requirements', async () => {
  const transport = mockTransport([
    { status: 200, json: { choices: [{ message: { content: 'amen' } }], usage: {} } },
  ]);
  const client = createClient({ apiKey: 'test', transport, prices: {} });
  const out = await client.call({ role: 'test', model: 'x/y', system: 's', user: 'u' });
  assert.equal(out.text, 'amen');
  assert.equal(transport.calls[0].body.provider, undefined);
  assert.equal(transport.calls[0].body.response_format, undefined);
});
