// pipeline/lib/feeds.mjs — v1.0 — 15JUL2026
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
 * Gather, merge, dedupe, score. Deterministic end to end.
 *
 * @param {object} opts
 * @param {object} opts.sources    parsed pipeline/sources.json
 * @param {function} opts.fetchImpl  fetch-compatible (injectable; offline in tests)
 * @param {number} [opts.now]      epoch ms — pinned in tests for determinism
 * @param {object} [opts.env]      env bag (TAVILY_API_KEY); defaults to process.env
 * @returns {Promise<{stories: Array, notes: string[]}>}
 *   stories: [{storyId, title, url, sources:[names], publishedAt, points, score, summary}]
 *   notes:   degradation notes for the Acta (which tiers answered, which died)
 */
export async function gatherStories({ sources, fetchImpl, now = Date.now(), env = process.env }) {
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
