---
title: 'Anthropic Frontier Red Team: GLM-5.3 develops full control flow hijacks'
date: '2026-09-30'
storyId: 1e2adcbb126c
citations:
  - title: Quoting Anthropic Frontier Red Team
    url: 'https://simonwillison.net/2026/Sep/29/anthropic-frontier-red-team'
    source: Simon Willison
stamps:
  nihilObstat: '2026-09-30'
---

Anthropic's Frontier Red Team has published findings on binary exploitation capabilities in current language models, as reported by Simon Willison on September 29, 2026, drawing on Anthropic's research post on the spread of advanced cyber capabilities.

Testing several models against 100 randomly selected tasks from an internal Binary Exploitation benchmark, the team found that GLM-5.3 achieved full control flow hijacks in 4 percent of trials. Claude Mythos Preview performed somewhat better on the same measure, succeeding in 6 percent of trials.

Anthropic's researchers state that despite GLM-5.3 trailing Claude Mythos Preview on this benchmark, "a meaningful threshold has clearly been crossed." The cited passage goes on to reference earlier models, naming Claude Opus 4.6 and GLM-5.2, before the excerpt available to this desk breaks off mid-sentence.

Willison's post quotes this passage from Anthropic's research directly, attributing the language to the Frontier Red Team without further elaboration in the portion reproduced.

The comparison places two current frontier models, one from Anthropic and one from a separate lab, on a shared internal benchmark measuring a specific offensive capability, control flow hijacking in binary exploitation tasks. The percentages reported, 4 percent for GLM-5.3 and 6 percent for Claude Mythos Preview, are presented as results from the same randomly selected task set. Beyond the quoted assessment that a threshold has been crossed, the excerpt provided does not elaborate on what benchmark performance preceding models registered.
