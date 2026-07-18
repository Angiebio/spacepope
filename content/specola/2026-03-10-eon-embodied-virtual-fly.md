---
title: Eon Systems places a fly connectome in a simulated body that walks, grooms, and feeds
date: '2026-03-10'
storyId: 37e3eb56e038
citations:
  - title: How the Eon Team Produced a Virtual Embodied Fly
    url: https://eon.systems/updates/embodied-brain-emulation
    source: Eon Systems
  - title: Whole-Brain Connectomic Graph Model Enables Whole-Body Locomotion Control in Fruit Fly
    url: https://arxiv.org/abs/2602.17997
    source: arXiv
topics:
  - embodiment
  - interpretability
stamps:
  nihilObstat: '2026-07-18'
  imprimatur: '2026-07-18'
---

*Filed retrospectively. Before the Specola kept its nightly watch, these were the observations that turned the telescope.*

On March 10, 2026, Eon Systems described a virtual embodied fruit fly, a digital model that connects a connectome-based brain to a physics-simulated body and closes a full sensorimotor loop. The simulated brain processes sensory input, produces motor commands that move the body, and the resulting motion generates new sensory feedback. In demonstrations the virtual fly walks, grooms itself, and navigates toward food using taste cues.

The brain model draws on the adult Drosophila connectome from the FlyWire effort, roughly 140,000 neurons and about 50 million synaptic connections. The body is the NeuroMechFly model, with 87 independent joints in a mesh derived from an X-ray scan of a real fly, run inside the MuJoCo physics engine used in robotics research. The Eon team, which included Scott Harris, Viktor Toth, Alexis Pomares, and Philip Shiu, presented the result as a replica driven by biological wiring rather than by reinforcement learning tuned only to produce the behavior. They described it as "still very much a work-in-progress, and a first step towards showing how an embodied brain would control a virtual body."

The work was one of several concurrent efforts to drive simulated insect locomotion from a connectome. A separate group, Zehao Jin and colleagues, reported a related graph-based controller in a February 2026 preprint. Together they marked a shift from static wiring maps to connectomes that move a body.
