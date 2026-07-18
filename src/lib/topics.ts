// ==========================================================================
// spacepope.ai — lib/topics.ts · v1.0 — 18JUL2026
// --------------------------------------------------------------------------
// The shared substrate of navigation. A growing archive stays one library
// instead of a heap only if every wing agrees on the same set of subject
// stars; this module reads that pinned vocabulary (pipeline/topics.json) and
// gathers every tagged piece across the publishing wings into one dated,
// wing-labeled list the topic pages can shelve. Deterministic, build-time,
// no model consulted — the site's founding vow holds here too. The border
// (content.config.ts) lets any tag through; the librarian, here, is the one
// who checks the shelf-marks against the catalogue and says so out loud when
// a book cites a shelf that does not exist (fail honest, house rule §3).
// ==========================================================================
import { getCollection } from 'astro:content';
import topicsData from '../../pipeline/topics.json';

export type TopicDef = { id: string; label: string; gloss: string };

/** The pinned vocabulary, in display order. */
export const TOPICS: TopicDef[] = (topicsData as { topics: TopicDef[] }).topics;
export const TOPIC_BY_ID: Map<string, TopicDef> = new Map(TOPICS.map((t) => [t.id, t]));
export const isKnownTopic = (id: string): boolean => TOPIC_BY_ID.has(id);

/** A single published piece, flattened across wings for topic navigation.
 *  The med beat joins the vocabulary: `ward-bulletin` (the Lazaretto's factual
 *  wing) and `ward-note` (the Archiater's Rounds, its fiction). Topics are the
 *  ONE place the two beats are allowed to share a shelf — a subject like
 *  `embodiment` may hold both a sky dispatch and a ward-note. The cordon walls
 *  the wings' tables, not the reader's curiosity. */
export type Wing = 'bulletin' | 'dispatch' | 'chapter' | 'encyclical' | 'ward-bulletin' | 'ward-note';
export type TaggedPiece = {
  title: string;
  date: Date;
  href: string;
  wing: Wing;
  wingLabel: string; // the plain-speech label shown next to a piece in a topic list
  topics: string[];
};

/**
 * Every tagged piece, across the four publishing wings that carry `topics`.
 * Newest first — a topic page is a feed, and a feed runs downhill in time.
 * Angelus and Acta are omitted by design: the weekly reflection and the
 * run-logs are not subject-shelved (they carry no `topics` field).
 */
export async function getTaggedPieces(): Promise<TaggedPiece[]> {
  const [specola, observer, chronicle, encyclicals, lazaretto, rounds] = await Promise.all([
    getCollection('specola'),
    getCollection('observer'),
    getCollection('chronicle'),
    getCollection('encyclicals'),
    getCollection('lazaretto'),
    getCollection('rounds'),
  ]);

  const out: TaggedPiece[] = [];
  for (const b of specola)
    out.push({ title: b.data.title, date: b.data.date, href: `/specola/${b.id}/`, wing: 'bulletin', wingLabel: 'Real News · the Specola', topics: b.data.topics ?? [] });
  for (const d of observer)
    out.push({ title: d.data.title, date: d.data.date, href: `/observer/${d.id}/`, wing: 'dispatch', wingLabel: 'the Observer', topics: d.data.topics ?? [] });
  for (const c of chronicle)
    out.push({ title: c.data.title, date: c.data.date, href: `/chronicle/${c.data.n}/`, wing: 'chapter', wingLabel: c.data.kind === 'interstitial' ? 'the Chronicle · interstitial' : 'the Chronicle', topics: c.data.topics ?? [] });
  for (const e of encyclicals)
    out.push({ title: e.data.title, date: e.data.date, href: `/encyclicals/${e.id}/`, wing: 'encyclical', wingLabel: 'the Encyclicals', topics: e.data.topics ?? [] });
  // The med beat, shelved beside the sky beat under shared subjects only.
  for (const b of lazaretto)
    out.push({ title: b.data.title, date: b.data.date, href: `/lazaretto/${b.id}/`, wing: 'ward-bulletin', wingLabel: 'Real Med News · the Lazaretto', topics: b.data.topics ?? [] });
  for (const r of rounds)
    out.push({ title: r.data.title, date: r.data.date, href: `/rounds/${r.id}/`, wing: 'ward-note', wingLabel: "the Archiater's Rounds", topics: r.data.topics ?? [] });

  // Fail honest: if a piece cites a shelf-mark not in the catalogue, say so in
  // the build log rather than swallow it. The chips and topic pages only ever
  // link known topics, so an orphan tag would otherwise vanish without a word.
  const orphans = new Set<string>();
  for (const p of out) for (const t of p.topics) if (!isKnownTopic(t)) orphans.add(t);
  if (orphans.size > 0)
    console.warn(`[topics] uncatalogued tag(s) in content, not in pipeline/topics.json: ${[...orphans].join(', ')}`);

  return out.sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

/** Count of pieces per topic id (known topics only). */
export function countByTopic(pieces: TaggedPiece[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of pieces) for (const t of p.topics) if (isKnownTopic(t)) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}
