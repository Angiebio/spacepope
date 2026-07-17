// The contracts between minds. Every LLM stage is a pure function:
// (role prompt, inputs, schema) → validated JSON. These schemas are the liturgy —
// an agent may improvise its prose, never its paperwork. OpenRouter enforces them
// via response_format json_schema strict:true + provider.require_parameters.
//
// If you change a schema here, change the fixtures in tests/golden/ in the same
// commit, or the golden run will excommunicate you.

/** The Nuncio's selection: which of the gathered stories deserve the telescope. */
export const NUNCIO_SELECTION = {
  name: 'nuncio_selection',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['selected', 'reasoning'],
    properties: {
      selected: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['storyId', 'headline', 'whyItMatters'],
          properties: {
            storyId: { type: 'string' },
            headline: { type: 'string' },
            whyItMatters: { type: 'string' },
          },
        },
      },
      reasoning: { type: 'string' },
    },
  },
};

/** Gate verdicts — the Censor Librorum and the Inquisitor share one shape. */
export const GATE_VERDICT = {
  name: 'gate_verdict',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['pass', 'faults'],
    properties: {
      pass: { type: 'boolean' },
      faults: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'severity', 'mustFix'],
          properties: {
            description: { type: 'string' },
            severity: { type: 'string', enum: ['hard', 'soft'] },
            mustFix: { type: 'boolean' },
          },
        },
      },
    },
  },
};

/** The Badger's ruling: name the fault, name the stage, never rewrite it yourself. */
export const BADGER_RULING = {
  name: 'badger_ruling',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['verdict', 'faults'],
    properties: {
      verdict: { type: 'string', enum: ['pass', 'redispatch', 'spike', 'flag'] },
      faults: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['stage', 'description', 'mustFix'],
          properties: {
            stage: { type: 'string' },
            description: { type: 'string' },
            mustFix: { type: 'boolean' },
          },
        },
      },
    },
  },
};

/** A Cardinal's bid in the College session: one line and a claim. */
export const COLLEGE_BID = {
  name: 'college_bid',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['claimScore', 'claimLine'],
    properties: {
      claimScore: { type: 'number', minimum: 0, maximum: 10 },
      claimLine: { type: 'string' },
    },
  },
};

/**
 * The Chronicler's STATE_UPDATE — state capture at WRITE time, never by re-reading
 * chapters later (the single most load-bearing pattern from the OSS research).
 * Emitted as a fenced JSON block after the chapter prose; parsed and diff-merged
 * deterministically. The LLM never rewrites state files wholesale.
 */
export const STATE_UPDATE = {
  name: 'state_update',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['chapter', 'dateInWorld', 'appearances', 'events', 'threadUpdates'],
    properties: {
      chapter: { type: 'number' },
      dateInWorld: { type: 'string' },
      appearances: { type: 'array', items: { type: 'string' } }, // entity slugs
      events: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['what', 'who', 'where'],
          properties: {
            what: { type: 'string' },
            who: { type: 'array', items: { type: 'string' } },
            where: { type: 'string' },
            thread: { type: 'string' },
          },
        },
      },
      threadUpdates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'status'],
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['open', 'escalated', 'dormant', 'resolved'] },
            note: { type: 'string' },
          },
        },
      },
      newEntities: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'type', 'name', 'oneLine'],
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['character', 'place', 'house', 'object'] },
            name: { type: 'string' },
            oneLine: { type: 'string' },
          },
        },
      },
      deaths: { type: 'array', items: { type: 'string' } },
      foreshadowingPlanted: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['what', 'thread'],
          properties: { what: { type: 'string' }, thread: { type: 'string' } },
        },
      },
      foreshadowingResolved: { type: 'array', items: { type: 'string' } },
      chapterDigest: { type: 'string' }, // 150-200 words, written in the same breath
    },
  },
};

/** The chapter plan: just-in-time beat expansion (DOME pattern). */
export const CHAPTER_PLAN = {
  name: 'chapter_plan',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'title', 'beats', 'threadsToTouch'],
    properties: {
      kind: { type: 'string', enum: ['chapter', 'interstitial'] },
      title: { type: 'string', maxLength: 60, description: 'the chapter title — short, evocative, like a chapter heading in a novel' },
      beats: { type: 'array', items: { type: 'string' }, maxItems: 6 },
      threadsToTouch: { type: 'array', items: { type: 'string' } },
      lintResponses: {
        type: 'array',
        items: { type: 'string' },
        description: 'how this chapter answers each lint finding it chooses to address',
      },
    },
  },
};
