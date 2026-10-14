---
title: 'Python 3.15 arrives, Python 3.10 deprecated'
date: '2026-10-14'
storyId: a31dac6d0b53
citations:
  - title: 'Hello Python 3.15, goodbye 3.10, and now I can use 3.11'
    url: 'https://simonwillison.net/2026/Oct/12/python-3-15'
    source: Simon Willison
stamps:
  nihilObstat: '2026-10-14'
---

Python 3.15 has been released, with the "What's New in Python 3.15" guide curated by Hugo van Kemenade, the release manager for both the 3.14 and 3.15 cycles.

According to developer Simon Willison, writing on his blog, the release carries practical consequences for maintainers of open source software that must support every currently supported Python version. With 3.15's arrival, Python 3.10 reaches the end of its support window and is deprecated. Willison notes this means he can now drop compatibility work for 3.10 in his own projects and begin adopting language and library features introduced in Python 3.11, which previously had to be avoided for backward compatibility reasons.

Willison's post highlights several features new to Python 3.15, though the excerpted material available here breaks off before detailing them in full. The post does reference the official "What's New in Python 3.15" documentation as the authoritative guide for developers seeking the complete list of changes.

The practical upshot, as described by Willison, is a shift in the baseline Python version that library authors must target, with the 3.10 to 3.11 transition now unlocked for projects that track the official support window. The post frames this as a routine but welcome annual milestone in the Python release cycle, tied directly to the language's standard deprecation schedule rather than any single new feature.
