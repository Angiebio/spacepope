// ==========================================================================
// spacepope.ai — lib/format.ts · v1.2 — 18JUL2026
// --------------------------------------------------------------------------
// Small deterministic conveniences shared by the pages. The site's spine is
// code (Hard Build Rule #2): dates, numerals, and excerpts are math, not
// prose, so they live here where they can never hallucinate. A chapter
// number rendered in Roman numerals is the cheapest vestment we own.
// v1.2: pagination arithmetic joins the shelf. An index that renders every
// item does not survive a year of dailies; PAGE_SIZE and pageHref are the
// deterministic rule for how the archive breaks into codices. Page one keeps
// the canonical address (/specola/); the rest live at /specola/page/N/ — a
// separate namespace, on purpose, so a page number can never be mistaken for
// a bulletin's slug or a chapter's number.
// ==========================================================================

/** Format a Date the way a colophon would: "15 July 2026". */
export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC', // frontmatter dates are calendar dates, not moments — pin the zone
  });
}

/**
 * Format a Date the way the Holy See's news column does: "16 - 07 - 2026".
 * The spaced hyphens are not a typo; they are the house style of the
 * institution we are impersonating, reproduced with curatorial care.
 */
export function fmtDateCurial(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd} - ${mm} - ${d.getUTCFullYear()}`;
}

/** Roman numerals for chapter headings — the genre demands it. */
export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let rest = Math.floor(n);
  for (const [v, s] of table) {
    while (rest >= v) { out += s; rest -= v; }
  }
  return out;
}

/**
 * A crude-but-honest excerpt: strip the markdown a human would notice,
 * cut on a word boundary. Used for archive lists and hero teasers.
 * (Deterministic on purpose — an LLM summarizer at build time would
 * violate the site's founding vow: the site never calls a model.)
 */
export function excerpt(md: string | undefined, words = 46): string {
  if (!md) return '';
  const text = md
    .replace(/^---[\s\S]*?---/, '')       // stray frontmatter fences
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')   // code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')// images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → text
    .replace(/^#{1,6}\s+.*$/gm, '')       // headings, whole line — a title is not a teaser
    .replace(/[*_>#]/g, '')               // emphasis + quote markers
    .replace(/\s+/g, ' ')
    .trim();
  const parts = text.split(' ');
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(' ') + ' …';
}

/**
 * How many items fill one codex of an index before it turns the page.
 * One knob, shared by all four section indexes so the archive breaks evenly.
 * ~15 keeps a page a comfortable scroll on the shortest phone.
 */
export const PAGE_SIZE = 15;

/**
 * The address of a given page of a section index. Page one is canonical at the
 * section root (/specola/); every later page lives under /section/page/N/, a
 * namespace that cannot collide with a single-segment bulletin slug or a
 * chapter number. The pager builds every link through this one function so the
 * scheme can never drift between the index and its later pages.
 */
export function pageHref(base: string, n: number): string {
  const b = base.replace(/\/$/, ''); // tolerate a trailing slash on the base
  return n <= 1 ? `${b}/` : `${b}/page/${n}/`;
}

/** Total number of pages for a list of `count` items at PAGE_SIZE. */
export function pageCount(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

/** Stable jewel-tone assignment for sigils: hash a slug into the glass. */
export function jewelFor(slug: string): string {
  const jewels = ['var(--c-ruby)', 'var(--c-sapphire)', 'var(--c-emerald)', 'var(--c-amethyst)', 'var(--c-topaz)'];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return jewels[h % jewels.length];
}
