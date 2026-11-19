---
title: Curl maintainer reports 200 bugfixes during AI rewrite experiment
date: '2026-11-19'
storyId: 569017a70fd8
citations:
  - title: Quoting Daniel Stenberg
    url: 'https://simonwillison.net/2026/Nov/18/daniel-stenberg'
    source: Simon Willison
stamps:
  nihilObstat: '2026-11-19'
---

Daniel Stenberg, the curl maintainer, has published an account comparing AI-driven rewrite efforts against ordinary maintenance work on the actual curl project, as reported by Simon Willison on November 18, 2026.

According to Stenberg's blog post, dated November 17, 2026 and cited by Willison, AI agents spent a period of a little over three weeks converting curl's codebase, roughly 185,000 lines of C, into approximately 340,000 lines of Rust. Stenberg states he counted these figures himself.

During that same window, Stenberg reports that the actual curl project merged over 300 commits. He writes that the project "actually improved curl" during those three-plus weeks, citing a little over 200 bugfixes completed in that span, plus several vulnerability fixes. Stenberg notes that none of these 200-plus fixes exist in the Rust rewrites produced by the AI agents. He adds that in the following month, the project completed roughly another 200 fixes.

Willison frames Stenberg's account as a data point on the distance between AI-generated code rewrites and the ongoing maintenance work required to keep software functioning and secure. The post offers no further detail on the rewrite agents' methodology, origin, or sponsorship beyond the line counts and timeframe Stenberg supplies.
