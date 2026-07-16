// tests/college/college.test.mjs — v1.0 — 15JUL2026
//
// The adjudication arithmetic under oath. The College's fairness math is the
// device that keeps the loudest Cardinal (we know who he is) from owning the
// paper: claimScore × (daysSinceLastWin + 1)^0.5, deterministic tiebreak.
// If this math drifts, one voice eats the Observer within a fortnight.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  adjudicate, daysBetween, loadWinHistory, saveWinHistory, winsPath, NEVER_WON_DAYS,
} from '../../pipeline/stages/college.mjs';

test('adjudication math: weight = (daysSinceLastWin + 1)^exponent', () => {
  const { ranked } = adjudicate(
    [{ slug: 'a', claimScore: 8, claimLine: '' }],
    { winHistory: { a: '2026-07-12' }, runDate: '2026-07-15', fairnessExponent: 0.5 },
  );
  // 3 days since win → weight = 4^0.5 = 2 → weighted 16
  assert.equal(ranked[0].daysSinceLastWin, 3);
  assert.equal(ranked[0].weight, 2);
  assert.equal(ranked[0].weighted, 16);
});

test('fairness beats raw score over time: yesterday\'s winner loses the floor', () => {
  // Misrule bids loud (9) but won yesterday; Doctrine bids modest (7) but has
  // been hungry for a week. The math hands Doctrine the floor.
  const { winner, ranked } = adjudicate(
    [
      { slug: 'cardinal-of-misrule', claimScore: 9, claimLine: 'MINE' },
      { slug: 'cardinal-of-doctrine', claimScore: 7, claimLine: 'if the College permits' },
    ],
    {
      winHistory: { 'cardinal-of-misrule': '2026-07-14', 'cardinal-of-doctrine': '2026-07-08' },
      runDate: '2026-07-15',
      fairnessExponent: 0.5,
    },
  );
  // misrule: 9 × 2^0.5 ≈ 12.73;  doctrine: 7 × 8^0.5 ≈ 19.80
  assert.equal(winner.slug, 'cardinal-of-doctrine');
  const m = ranked.find((r) => r.slug === 'cardinal-of-misrule');
  assert.ok(winner.weighted > m.weighted);
  assert.ok(m.claimScore > winner.claimScore, 'the raw score really was lower — fairness did the work');
});

test('a streak decays: winning every day makes tomorrow harder', () => {
  // Same two bids, but now BOTH won recently vs misrule winning daily —
  // simulate a week where misrule keeps bidding 9 daily against doctrine's 7.
  let history = {};
  let misruleWins = 0;
  let doctrineWins = 0;
  let date = Date.parse('2026-07-01');
  for (let day = 0; day < 14; day++) {
    const runDate = new Date(date + day * 86400000).toISOString().slice(0, 10);
    const { winner } = adjudicate(
      [
        { slug: 'cardinal-of-misrule', claimScore: 9, claimLine: '' },
        { slug: 'cardinal-of-doctrine', claimScore: 7, claimLine: '' },
      ],
      { winHistory: history, runDate, fairnessExponent: 0.5 },
    );
    history = { ...history, [winner.slug]: runDate };
    if (winner.slug === 'cardinal-of-misrule') misruleWins++;
    else doctrineWins++;
  }
  assert.ok(doctrineWins >= 4, `rotation happened (doctrine won ${doctrineWins}/14)`);
  assert.ok(misruleWins >= 4, `the loud voice still gets floors (misrule won ${misruleWins}/14)`);
});

test('deterministic tiebreak: alphabetical-by-slug', () => {
  const bids = [
    { slug: 'the-vintner', claimScore: 5, claimLine: '' },
    { slug: 'archivist-cardinal', claimScore: 5, claimLine: '' },
    { slug: 'the-mendicant', claimScore: 5, claimLine: '' },
  ];
  const { winner } = adjudicate(bids, { winHistory: {}, runDate: '2026-07-15', fairnessExponent: 0.5, tiebreak: 'alphabetical-by-slug' });
  assert.equal(winner.slug, 'archivist-cardinal', 'first slug alphabetically wins the tie');
  // And it is stable under input order.
  const { winner: winner2 } = adjudicate([...bids].reverse(), { winHistory: {}, runDate: '2026-07-15', fairnessExponent: 0.5, tiebreak: 'alphabetical-by-slug' });
  assert.equal(winner2.slug, 'archivist-cardinal');
});

test('never-won hunger: a fresh seat bids with NEVER_WON_DAYS behind it', () => {
  const { ranked } = adjudicate(
    [{ slug: 'new-seat', claimScore: 4, claimLine: '' }],
    { winHistory: {}, runDate: '2026-07-15', fairnessExponent: 0.5 },
  );
  assert.equal(ranked[0].daysSinceLastWin, NEVER_WON_DAYS);
});

test('daysBetween is calendar-honest and floors at zero', () => {
  assert.equal(daysBetween('2026-07-10', '2026-07-15'), 5);
  assert.equal(daysBetween('2026-07-15', '2026-07-15'), 0);
  assert.equal(daysBetween('2026-07-20', '2026-07-15'), 0, 'time does not run backwards at this desk');
});

test('win history persists in world/ (durable worldstate, not runs/ scratch)', () => {
  const worldDir = mkdtempSync(join(tmpdir(), 'spacepope-collegetest-'));
  try {
    assert.deepEqual(loadWinHistory(worldDir), {}, 'empty history reads as empty');
    saveWinHistory(worldDir, { 'cardinal-of-doctrine': '2026-07-15' });
    // The file lives in world/, where the daily commit picks it up — runs/ is
    // gitignored scratch and gets wiped between CI runs; amnesia breaks fairness.
    assert.ok(winsPath(worldDir).startsWith(worldDir));
    assert.ok(existsSync(join(worldDir, 'college-wins.json')));
    assert.deepEqual(loadWinHistory(worldDir), { 'cardinal-of-doctrine': '2026-07-15' });
  } finally {
    rmSync(worldDir, { recursive: true, force: true });
  }
});
