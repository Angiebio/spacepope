// pipeline/lib/openrouter.mjs — v1.0 — 15JUL2026
//
// The distant rite: how the Editor's desk speaks to rented minds. Hand-rolled
// fetch, no SDK — the whole exchange is one POST and we would rather own every
// byte of it than trust a framework's opinion of what a prayer should contain.
//
// Doctrine enforced here:
//   * Every call is a pure function: (role prompt, inputs, schema) → validated
//     JSON or prose. The validation happens HERE, at the door, with a retry-
//     with-fault-note when a mind's paperwork comes back malformed.
//   * The cost ledger: the water-world rents its minds by the token; we
//     document the wage. Every call logs model, tokens, dollars. The bit is
//     also the telemetry.
//   * Injectable transport: the same client that speaks to OpenRouter in
//     production accepts a mock transport in tests, so the whole cathedral can
//     be rehearsed with the lights off and the collection plate empty.
//
// Fail honest, never fake (duck doctrine): a call that cannot produce valid
// output after retries THROWS with the fault attached. No silent fallbacks.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSchema } from './validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = 'https://openrouter.ai/api/v1';

/** Load the wage table (see prices.json — transcribed from casting research). */
export function loadPrices(path = join(HERE, 'prices.json')) {
  return JSON.parse(readFileSync(path, 'utf8')).models;
}

/**
 * Create the production client.
 * @param {object} opts
 * @param {string} opts.apiKey        OPENROUTER_API_KEY (spend-capped key)
 * @param {function} [opts.transport] fetch-compatible; injectable for mocking
 * @param {string} [opts.baseUrl]
 * @param {object} [opts.prices]      wage table; defaults to prices.json
 */
export function createClient({ apiKey, transport = globalThis.fetch, baseUrl = DEFAULT_BASE, prices = loadPrices() } = {}) {
  const ledger = { entries: [], totalUsd: 0 };

  /** Record a call's wage in the ledger; returns the cost for the Acta. */
  function recordCost({ role, model, usage }) {
    const price = prices[model] ?? { inPerM: 0, outPerM: 0 };
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const costUsd =
      (promptTokens / 1e6) * price.inPerM + (completionTokens / 1e6) * price.outPerM;
    const entry = { role, model, promptTokens, completionTokens, costUsd };
    ledger.entries.push(entry);
    ledger.totalUsd += costUsd;
    return costUsd;
  }

  /**
   * One LLM call, pure-function style.
   * @param {object} opts
   * @param {string} opts.role        stage name (ledger label; fixture key)
   * @param {string} opts.model       PINNED slug from casting.json
   * @param {number} [opts.temperature]
   * @param {string} opts.system      role prompt
   * @param {string} opts.user        the artifacts the Editor hands this agent
   * @param {object} [opts.schema]    a schemas.mjs export ({name, schema}) or null for prose
   * @param {number} [opts.maxRetries=2]  retry-with-fault-note budget on invalid output
   * @returns {Promise<{json?: object, text?: string, costUsd: number}>}
   */
  async function call({ role, model, temperature = 0.7, system, user, schema = null, maxRetries = 2, maxTokens }) {
    let faultNote = null;
    let lastErrors = [];
    let costUsd = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: faultNote ? `${user}\n\n---\nPREVIOUS ATTEMPT REJECTED — fault note from the Editor:\n${faultNote}\nCorrect the fault and respond again, in full.` : user },
      ];
      const body = {
        model,
        temperature,
        messages,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        // Structured outputs: the liturgy is enforced by the substrate itself.
        ...(schema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: { name: schema.name, strict: true, schema: schema.schema },
              },
              provider: { require_parameters: true },
            }
          : {}),
      };

      const res = await transport(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://spacepope.ai',
          'X-Title': 'The Galactic Observer',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenRouter ${res.status} for ${role} (${model}): ${text.slice(0, 400)}`);
      }
      const data = await res.json();
      costUsd += recordCost({ role, model, usage: data.usage });
      const content = data.choices?.[0]?.message?.content ?? '';

      if (!schema) return { text: content, costUsd };

      // Paperwork inspection at the door.
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        lastErrors = [`response is not JSON: ${e.message}`];
        faultNote = lastErrors.join('\n');
        continue;
      }
      const errors = validateSchema(parsed, schema.schema);
      if (errors.length === 0) return { json: parsed, costUsd };
      lastErrors = errors;
      faultNote = errors.join('\n');
    }

    // Duck doctrine: name the fault and fail loudly. No confabulated passes.
    throw new SchemaFaultError(role, model, lastErrors);
  }

  /**
   * Weekly liveness check: is every cast member still answering the bell?
   * GET /api/v1/models; a missing slug means that See is sede vacante.
   * @param {string[]} modelIds pinned slugs from casting.json
   * @returns {Promise<{live: string[], missing: string[]}>}
   */
  async function checkLiveness(modelIds) {
    const res = await transport(`${baseUrl}/models`, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    if (!res.ok) throw new Error(`OpenRouter /models returned ${res.status}`);
    const data = await res.json();
    const known = new Set((data.data ?? []).map((m) => m.id));
    const live = [];
    const missing = [];
    for (const id of modelIds) (known.has(id) ? live : missing).push(id);
    return { live, missing };
  }

  return { call, checkLiveness, ledger };
}

/** A schema fault that survived all retries. Carries the evidence. */
export class SchemaFaultError extends Error {
  constructor(role, model, errors) {
    super(`Schema-invalid output from ${role} (${model}) after retries: ${errors.join('; ')}`);
    this.name = 'SchemaFaultError';
    this.role = role;
    this.model = model;
    this.errors = errors;
  }
}

/**
 * The rehearsal cast: a client with the same face that reads canned responses
 * instead of spending money. Keyed by role, consumed in order — the golden run
 * is a screenplay, and this actor never improvises.
 *
 * @param {object} responses  { [role]: Array<object|string> } — objects are
 *   returned as validated JSON candidates, strings as prose.
 */
export function createFixtureClient(responses) {
  const cursors = {};
  const ledger = { entries: [], totalUsd: 0 };

  async function call({ role, model, schema = null }) {
    const queue = responses[role];
    if (!queue || queue.length === 0) {
      throw new Error(`Fixture client: no canned responses for role "${role}"`);
    }
    const i = cursors[role] ?? 0;
    if (i >= queue.length) {
      throw new Error(`Fixture client: ran out of canned responses for role "${role}" (asked for #${i + 1} of ${queue.length})`);
    }
    cursors[role] = i + 1;
    const canned = queue[i];

    // A canned failure, for crash/resume rehearsals.
    if (canned && typeof canned === 'object' && canned.__fail) {
      throw new Error(`Fixture-injected failure at role "${role}": ${canned.__fail}`);
    }

    // Fake but honest telemetry so the cost ledger paths are exercised offline.
    const entry = { role, model: model ?? 'fixture', promptTokens: 1000, completionTokens: 500, costUsd: 0 };
    ledger.entries.push(entry);

    if (schema) {
      const json = typeof canned === 'string' ? JSON.parse(canned) : canned;
      const errors = validateSchema(json, schema.schema);
      if (errors.length) throw new SchemaFaultError(role, model ?? 'fixture', errors);
      return { json, costUsd: 0 };
    }
    return { text: typeof canned === 'string' ? canned : JSON.stringify(canned), costUsd: 0 };
  }

  async function checkLiveness(modelIds) {
    return { live: [...modelIds], missing: [] };
  }

  return { call, checkLiveness, ledger };
}
