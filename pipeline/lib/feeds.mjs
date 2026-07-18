// pipeline/lib/feeds.mjs — v1.2 — 18JUL2026 (the Showrunner's suggestion box: Tier 0, additive)
//
// The Nuncio's deterministic half: the legwork before the judgment. Walking
// the wire services is plumbing, not perception — so it is code, not a model
// (deterministic spine, LLM decoration). The Nuncio's LLM half only ever sees
// what this module gathered, deduped, and scored; it ranks, it does not fetch.
//
// Ecclesiastically: the nuncio rides out each morning to the water-world's
// criers and notice-boards, and returns with everything nailed to everything.
// Three graceful-degradation tiers (RSS → HN Algolia → Tavily): every layer
// can die and the pipeline still files. A quiet wire is a finding, not a
// failure — thin news becomes "a quiet day in the communion," honestly.
//
// All network goes through an injectable fetchImpl so the whole gathering can
// be rehearsed offline from canned XML/JSON.

import Parser from 'rss-parser';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

/**
 * Canonicalize a URL for dedupe: two criers shouting the same address should
 * count as one story twice, not two stories.
 * Strips tracking params, hash, trailing slash, www, lowercases the host.
 */
export function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    // Tracking confetti off the shoes before entering the archive.
    const drop = [...u.searchParams.keys()].filter(
      (k) => /^(utm_|fbclid|gclid|ref|source|mc_cid|mc_eid|cmpid)/i.test(k),
    );
    for (const k of drop) u.searchParams.delete(k);
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return String(raw).trim();
  }
}

/** Stable story id: a short hash of the canonical URL. */
export function storyId(url) {
  return createHash('sha1').update(canonicalUrl(url)).digest('hex').slice(0, 12);
}

/**
 * Normalize a headline for cross-day matching: lowercase, strip punctuation,
 * collapse whitespace. The same story returns on day two wearing a different
 * URL and a different capitalization; the title underneath is the same face.
 */
export function normalizeTitle(t) {
  return String(t ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The covered-stories ledger — built from the Specola's own published archive.
 * No new state file: the newspaper IS the memory. Every bulletin's frontmatter
 * carries its storyId and citation URLs; before the Nuncio rides out, it reads
 * what the See already printed. (Found the hard way on 17JUL2026, when the
 * Specola solemnly reported the same two stories on consecutive days and the
 * Chronicle went hungry for want of fresh news.)
 *
 * @param {string} specolaDir  content/specola directory
 * @returns {{ids: Set<string>, urls: Set<string>, titles: Set<string>}}
 */
export function loadCoveredLedger(specolaDir) {
  const ledger = { ids: new Set(), urls: new Set(), titles: new Set() };
  let files = [];
  try {
    files = readdirSync(specolaDir).filter((f) => f.endsWith('.md'));
  } catch {
    return ledger; // no archive yet — a young See has covered nothing
  }
  for (const f of files) {
    try {
      const fm = matter(readFileSync(join(specolaDir, f), 'utf8')).data;
      if (fm.storyId) ledger.ids.add(String(fm.storyId));
      if (fm.title) ledger.titles.add(normalizeTitle(fm.title));
      for (const c of fm.citations ?? []) {
        if (c?.url) {
          ledger.urls.add(canonicalUrl(c.url));
          ledger.ids.add(storyId(c.url));
        }
      }
    } catch {
      // an unreadable bulletin does not stop the presses; it is just not remembered
    }
  }
  return ledger;
}

/**
 * Drop gathered stories the Specola has already covered. Three nets, because
 * the same fish swims back in three disguises: same id (same URL re-picked),
 * same canonical URL under a fresh id path, same headline under a new URL.
 * @returns {{fresh: Array, covered: Array}}
 */
export function filterCovered(stories, ledger) {
  const fresh = [];
  const covered = [];
  for (const s of stories) {
    const isCovered =
      ledger.ids.has(s.storyId) ||
      ledger.urls.has(canonicalUrl(s.url)) ||
      ledger.titles.has(normalizeTitle(s.title));
    (isCovered ? covered : fresh).push(s);
  }
  return { fresh, covered };
}

/**
 * Load the Showrunner's suggestion box. A hand-kept inbox of stories the
 * Editor wants the Nuncio to consider, ADDITIVE to organic finds, never a
 * replacement (the Showrunner's own instruction). Entries persist until the
 * covered-ledger retires them, which happens the day they are published, so a
 * suggestion keeps being offered until it is actually covered.
 *
 * The Boost, not the Bypass: a suggested story is scored high enough to be a
 * near-certain candidate, but it still passes through the ranking Nuncio and
 * every gate downstream. The Editor can point the telescope; the Editor cannot
 * fabricate a source or slip a real name past the Inquisitor. Suggestion is not
 * override.
 *
 * @param {string} path  pipeline/suggestions.json
 * @returns {Array<{url: string, note?: string}>}
 */
export function loadSuggestions(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return (parsed.suggestions ?? []).filter((s) => s && s.url);
  } catch {
    return []; // no inbox, or an unreadable one, is simply an empty inbox
  }
}

/** Fetch a suggested URL's page title so the Nuncio has something to rank on. */
async function titleFor(url, fetchImpl, headers) {
  try {
    const res = await fetchImpl(url, { headers });
    if (!res.ok) return null;
    const html = await res.text();
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (og) return og[1].trim();
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return t ? t[1].trim() : null;
  } catch {
    return null;
  }
}

const SUGGESTION_BOOST = 1000; // sorts editorial picks to the top of the candidate slice

/**
 * Gather, merge, dedupe, score. Deterministic end to end.
 *
 * @param {object} opts
 * @param {object} opts.sources    parsed pipeline/sources.json
 * @param {function} opts.fetchImpl  fetch-compatible (injectable; offline in tests)
 * @param {number} [opts.now]      epoch ms — pinned in tests for determinism
 * @param {object} [opts.env]      env bag (TAVILY_API_KEY); defaults to process.env
 * @param {Array} [opts.suggestions]  the Showrunner's box (see loadSuggestions)
 * @returns {Promise<{stories: Array, notes: string[]}>}
 *   stories: [{storyId, title, url, sources:[names], publishedAt, points, score, summary, suggested?, note?}]
 *   notes:   degradation notes for the Acta (which tiers answered, which died)
 */
export async function gatherStories({ sources, fetchImpl, now = Date.now(), env = process.env, suggestions = [] }) {
  const notes = [];
  const byUrl = new Map(); // canonical url → accumulating story
  const parser = new Parser();
  const headers = { 'User-Agent': sources.userAgent };

  function addItem({ title, url, sourceName, weight = 1, publishedAt = null, points = 0, summary = '' }) {
    if (!url || !title) return;
    const canon = canonicalUrl(url);
    let story = byUrl.get(canon);
    if (!story) {
      story = {
        storyId: storyId(canon),
        title: String(title).trim(),
        url: canon,
        sources: [],
        weights: [],
        publishedAt,
        points: 0,
        summary: String(summary || '').slice(0, 500),
      };
      byUrl.set(canon, story);
    }
    if (!story.sources.includes(sourceName)) {
      story.sources.push(sourceName);
      story.weights.push(weight);
    }
    story.points = Math.max(story.points, points);
    if (!story.publishedAt && publishedAt) story.publishedAt = publishedAt;
    if (!story.summary && summary) story.summary = String(summary).slice(0, 500);
  }

  // ---- Tier 1: RSS ----------------------------------------------------------
  for (const feed of sources.rss) {
    try {
      const res = await fetchImpl(feed.url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const parsed = await parser.parseString(xml);
      const cutoff = now - 1000 * 60 * 60 * 48; // 48h window; stale caches (VentureBeat) age out here
      for (const item of parsed.items ?? []) {
        const when = item.isoDate ? Date.parse(item.isoDate) : item.pubDate ? Date.parse(item.pubDate) : null;
        if (when !== null && when < cutoff) continue;
        addItem({
          title: item.title,
          url: item.link,
          sourceName: feed.name,
          weight: feed.weight ?? 1,
          publishedAt: when ? new Date(when).toISOString() : null,
          summary: item.contentSnippet ?? item.summary ?? '',
        });
      }
    } catch (e) {
      // Optional feeds may die quietly; required feeds die loudly but non-fatally.
      notes.push(`rss:${feed.name} failed (${e.message})${feed.optional ? ' [optional]' : ''}`);
    }
  }

  // ---- Tier 2: HN Algolia (the popularity signal AND the resilience layer) --
  try {
    const hn = sources.hackernews;
    const since = Math.floor((now - hn.windowHours * 3600 * 1000) / 1000);
    const qs = new URLSearchParams({
      query: hn.query,
      tags: 'story',
      numericFilters: `points>${hn.minPoints},created_at_i>${since}`,
      hitsPerPage: String(hn.hitsPerPage),
    });
    const res = await fetchImpl(`${hn.endpoint}?${qs}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    for (const hit of data.hits ?? []) {
      if (!hit.url) continue; // Ask-HN self-posts have no external citation; the Specola needs one
      addItem({
        title: hit.title,
        url: hit.url,
        sourceName: 'Hacker News',
        weight: 1,
        publishedAt: hit.created_at ?? null,
        points: hit.points ?? 0,
      });
    }
  } catch (e) {
    notes.push(`hackernews failed (${e.message})`);
  }

  // ---- Score + shape ---------------------------------------------------------
  // Score = HN points + cross-source appearance count (ROADMAP-02 §4), with
  // source weights as a fractional nudge so a Willison pick edges out a
  // stale-cache pick at equal counts. Deterministic; the Nuncio LLM ranks on top.
  let stories = [...byUrl.values()].map((s) => ({
    storyId: s.storyId,
    title: s.title,
    url: s.url,
    sources: s.sources,
    publishedAt: s.publishedAt,
    points: s.points,
    score: s.points + s.sources.length + s.weights.reduce((a, b) => a + b, 0) / 10,
    summary: s.summary,
  }));
  stories.sort((a, b) => b.score - a.score || a.storyId.localeCompare(b.storyId));

  // ---- Tier 0: the Showrunner's suggestion box (additive, boosted, gated) ----
  // Placed after organic scoring so the boost lifts editorial picks above the
  // day's noise without deleting a single organic find. A suggestion that also
  // surfaced organically is flagged and boosted in place, never duplicated.
  for (const sug of suggestions) {
    const canon = canonicalUrl(sug.url);
    const id = storyId(canon);
    const existing = stories.find((s) => s.storyId === id);
    if (existing) {
      existing.suggested = true;
      existing.note = sug.note ?? existing.note;
      existing.score += SUGGESTION_BOOST;
      existing.sources = [...new Set([...existing.sources, 'Showrunner'])];
      continue;
    }
    const title = (await titleFor(canon, fetchImpl, headers)) || sug.note || canon;
    stories.push({
      storyId: id,
      title,
      url: canon,
      sources: ['Showrunner'],
      publishedAt: null,
      points: 0,
      score: SUGGESTION_BOOST,
      summary: sug.note ?? '',
      suggested: true,
      note: sug.note ?? '',
    });
  }
  if (suggestions.length) {
    notes.push(`suggestion box: ${suggestions.length} editorial pick(s) added to the pool`);
    stories.sort((a, b) => b.score - a.score || a.storyId.localeCompare(b.storyId));
  }

  // ---- Tier 3: Tavily fallback — fires ONLY on a thin-news day ----------------
  if (stories.length < sources.fallback.fireWhenFewerThan) {
    const extra = await tavilyFallback({ sources, fetchImpl, env, notes });
    for (const s of extra) {
      if (![...byUrl.keys()].includes(s.url)) stories.push(s);
    }
    stories.sort((a, b) => b.score - a.score || a.storyId.localeCompare(b.storyId));
  }

  return { stories, notes };
}

/**
 * Tier 3: Tavily. 1,000 free credits/month; only rung on a thin-news day.
 * Degrades gracefully to nothing without TAVILY_API_KEY — a missing key is a
 * note in the Acta, never a crash. (Fail honest: the quiet day is reported
 * as quiet, not padded with confabulated news.)
 */
async function tavilyFallback({ sources, fetchImpl, env, notes }) {
  if (sources.fallback.provider !== 'tavily') return [];
  const key = env.TAVILY_API_KEY;
  if (!key) {
    notes.push('tavily fallback wanted but TAVILY_API_KEY absent — degrading to quiet day');
    return [];
  }
  try {
    const res = await fetchImpl('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: 'artificial intelligence news today',
        topic: 'news',
        days: 1,
        max_results: 8,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    notes.push(`tavily fallback fired: ${data.results?.length ?? 0} results`);
    return (data.results ?? []).map((r) => ({
      storyId: storyId(r.url),
      title: r.title,
      url: canonicalUrl(r.url),
      sources: ['Tavily'],
      publishedAt: r.published_date ?? null,
      points: 0,
      score: r.score ?? 0,
      summary: String(r.content ?? '').slice(0, 500),
    }));
  } catch (e) {
    notes.push(`tavily fallback failed (${e.message})`);
    return [];
  }
}
