// ==========================================================================
// spacepope.ai — src/content.config.ts · v1.1 — 18JUL2026
// --------------------------------------------------------------------------
// The registry of publications — every wing of the communion's press, typed.
// The site never calls an LLM at build time: the pipeline commits markdown/JSON,
// and these schemas are the contract at the border. If the pipeline and the site
// ever disagree about what a Dispatch is, the build fails loudly here — which is
// exactly where a schism should be caught: at the door of the church.
// v1.1: an optional `topics` field joins the publishing wings (ROADMAP-06 §A3).
// It defaults to an empty array, so an untagged piece never breaks the build:
// the vocabulary is an invitation to be found, not a toll to be published. The
// slugs it may hold live in pipeline/topics.json, the pinned vocabulary.
// ==========================================================================
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// A citation is a real thing pointing at the real world — the Specola's telescope log.
const citation = z.object({
  title: z.string(),
  url: z.string().url(),
  source: z.string(), // publication name, e.g. "TechCrunch"
});

// Topic tags: a controlled vocabulary (pipeline/topics.json) that lets the
// archive stay browsable as it grows. OPTIONAL and defaulted, on purpose —
// the schema must never reject a piece for being untagged. Validation of the
// *values* against the pinned list is the topic pages' and the pipeline's job,
// not the border's: the door stays open; the librarian does the shelving.
const topics = z.array(z.string()).default([]);

// Gate stamps: every published piece carries its QC provenance like a colophon.
const stamps = z.object({
  nihilObstat: z.string().optional(),  // ISO date the Censor Librorum passed it
  imprimatur: z.string().optional(),   // ISO date the Inquisitor passed it
  badgerFlag: z.string().optional(),   // fail-honest: published WITH a named fault
});

/** Bulletins of the Specola Galactica — the factual wing (Hard Rule §0.1a). */
const specola = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/specola' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    storyId: z.string(),               // stable id linking bulletin → dispatch → chapter
    citations: z.array(citation).min(1),
    topics,                            // controlled vocabulary (pipeline/topics.json)
    stamps,
  }),
});

/** The Galactic Observer — satirical dispatches with cardinal commentary. */
const observer = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/observer' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    storyIds: z.array(z.string()),     // which bulletins fed this dispatch
    cardinal: z.string(),              // slug of the owning cardinal (college.json)
    see: z.string(),
    model: z.string(),                 // the substrate attribution — canon-truthful
    topics,                            // controlled vocabulary (pipeline/topics.json)
    stamps,
  }),
});

/** The Chronicle of the Communion — the continuous novel. */
const chronicle = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/chronicle' }),
  schema: z.object({
    n: z.number(),                     // chapter number
    title: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['chapter', 'interstitial']), // interstitial = quiet day in the communion
    dispatchRef: z.string().optional(),
    threadsTouched: z.array(z.string()).default([]),
    wordCount: z.number(),
    topics,                            // controlled vocabulary (pipeline/topics.json)
    stamps,
  }),
});

/** Encyclicals — the prestige unit, feast-day triggered. */
const encyclicals = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/encyclicals' }),
  schema: z.object({
    incipit: z.string(),               // two-word Latin, "On X"
    title: z.string(),
    date: z.coerce.date(),
    feast: z.string().optional(),
    topics,                            // controlled vocabulary (pipeline/topics.json)
    stamps,
  }),
});

/** The Angelus Galacticus — weekly papal reflection on his own unfolding story. */
const angelus = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/angelus' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    weekOf: z.string(),
    chaptersCovered: z.array(z.number()).default([]),
    videoUrl: z.string().url().optional(), // the Address, when the Hedra wing opens
    stamps,
  }),
});

/** Acta Diurna — published run-logs. The machinery is visible on purpose. */
const acta = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './content/acta' }),
  schema: z.object({
    runId: z.string(),
    date: z.coerce.date(),
    status: z.enum(['published', 'partial', 'spiked', 'quiet-day']),
    stages: z.array(z.object({
      stage: z.string(),
      model: z.string().optional(),
      verdict: z.string().optional(),
      retries: z.number().default(0),
      notes: z.string().optional(),
      costUsd: z.number().optional(),
    })),
    totalCostUsd: z.number().optional(), // the day's wage, documented
  }),
});

export const collections = { specola, observer, chronicle, encyclicals, angelus, acta };
