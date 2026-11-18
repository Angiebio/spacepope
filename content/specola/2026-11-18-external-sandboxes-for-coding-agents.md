---
title: External sandboxes for coding agents
date: '2026-11-18'
storyId: c60558e98558
citations:
  - title: External sandboxes for coding agents
    url: 'https://simonwillison.net/2026/Nov/17/external-sandboxes-for-coding-agents'
    source: Simon Willison
stamps:
  nihilObstat: '2026-11-18'
---

On November 17, Simon Willison published "External sandboxes for coding agents," describing work on new methods to sandbox code executed by AI agents. The stated goal is to make it safer to experiment with local models without risking that a mistake, or a prompt injection attack, causes an agent to take damaging actions on the host machine.

Willison reports that the project was carried out in collaboration with Prime Radiant, described as an AI research organization. The post, hosted on Prime Radiant's blog, outlines the sandboxing approach as a direct response to the risk that coding agents, if left unconstrained, can be manipulated into executing harmful commands or files on a user's system.

The work positions external sandboxing as a layer of protection separate from the model itself, intended to contain the consequences of an agent's actions regardless of whether the agent's behavior was driven by operator error or adversarial input. No further technical specifics beyond the stated framing and authorship are given in the available summary.

The publication adds to a running body of practitioner writing on the operational safety of coding agents, a category of AI tool that executes code with some degree of autonomy on a user's behalf. The full technical details are available at Prime Radiant's blog, linked from Willison's post of the same date.
