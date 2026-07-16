// pipeline/lib/validate.mjs — v1.0 — 15JUL2026
//
// The rubric by which paperwork is judged. Every LLM stage promises JSON in a
// pinned shape (pipeline/lib/schemas.mjs); this is the deterministic clerk who
// checks the promise before anyone downstream trusts it. We do not import a
// 50-module validator to check five schemas — the clerk is small enough to
// audit by eye, which is the point: the gate that guards the gates must itself
// be legible.
//
// Ecclesiastically: an agent may improvise its prose, never its paperwork.
// This is the office that stamps the paperwork.
//
// Supports exactly the JSON-Schema subset our pinned schemas use:
// type (object/array/string/number/boolean), required, properties,
// additionalProperties:false, enum, items, minimum/maximum, maxItems.

/**
 * Validate `value` against a schema (the subset used by schemas.mjs).
 * @returns {string[]} list of human-readable errors; empty = valid.
 */
export function validateSchema(value, schema, path = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  // -- type check ------------------------------------------------------------
  if (schema.type) {
    const t = jsonType(value);
    if (t !== schema.type) {
      errors.push(`${path}: expected ${schema.type}, got ${t}`);
      return errors; // no point descending into the wrong shape
    }
  }

  // -- enum ------------------------------------------------------------------
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: "${value}" not in enum [${schema.enum.join(', ')}]`);
  }

  // -- numbers ---------------------------------------------------------------
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: ${value} > maximum ${schema.maximum}`);
    }
  }

  // -- objects ---------------------------------------------------------------
  if (schema.type === 'object' && jsonType(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: missing required "${key}"`);
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in value) errors.push(...validateSchema(value[key], sub, `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push(`${path}: unexpected property "${key}"`);
      }
    }
  }

  // -- arrays ----------------------------------------------------------------
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: ${value.length} items > maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      value.forEach((item, i) => errors.push(...validateSchema(item, schema.items, `${path}[${i}]`)));
    }
  }

  return errors;
}

function jsonType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}
