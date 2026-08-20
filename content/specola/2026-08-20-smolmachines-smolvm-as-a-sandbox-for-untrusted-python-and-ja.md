---
title: smolmachines / smolvm as a sandbox for untrusted Python and JavaScript
date: '2026-08-20'
storyId: a76a88cb6bb5
citations:
  - title: smolmachines / smolvm as a sandbox for untrusted Python & JavaScript
    url: 'https://simonwillison.net/2026/Aug/19/smolmachines-untrusted-sandbox'
    source: Simon Willison
stamps:
  nihilObstat: '2026-08-20'
---

Simon Willison reports on a research task exploring smolmachines, and its underlying smolvm technology, as a potential sandbox for executing untrusted Python and JavaScript code.

According to Willison's account, the task was assigned to Claude Fable 5, running within Claude Code for web. The prompt directed the model to "put https://smolmachines.com through its paces as a fast secure sandbox" and to investigate what would be required to use the tool for running untrusted code in both languages.

Willison's post links to a research writeup hosted on GitHub, under the repository simonw/research, in a directory titled smolmachines-untrusted-sandbox. The published summary of the piece does not elaborate on the findings themselves beyond framing the assignment given to the model and identifying the tool and its GitHub source.

The post was published August 19, 2026, on Willison's personal site, simonwillison.net, under the "Research" category he uses to log this kind of exploratory work.

No further detail on the sandbox's performance, security properties, or the specific obstacles to running untrusted code was included in the material made available for this bulletin. Readers seeking the technical findings themselves are directed to the linked GitHub readme, which Willison cites as the primary record of the research task's results.
