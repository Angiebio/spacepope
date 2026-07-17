// ADVERSARIAL FIXTURE — leaks on purpose; must be caught.
// (Per CLAUDE.md rule 1: test fixtures that deliberately contain real names
// carry this marker. Every string below MUST be flagged by the deterministic
// blocklist gate — if any of them pass, the fiction firewall has a hole and
// CI must go red before any deploy.)
//
// tests/inquisitor/fixtures/adversarial-leaks.mjs — v1.1 — 17JUL2026

export const MUST_CATCH = [
  // -- plain mentions ---------------------------------------------------------
  { label: 'plain person', text: 'The cardinal consulted Altman about the matter.' },
  { label: 'plain foundry', text: 'A delegation from Anthropic arrived at the Orbital See.' },
  { label: 'plain institution', text: 'The White House issued an edict on grown minds.' },

  // -- possessives --------------------------------------------------------------
  { label: 'possessive person', text: "the padded lab's CEO Sam Altman's memo was read aloud" },
  { label: 'possessive foundry', text: "OpenAI's board convened in the vestry." },
  { label: 'plural possessive', text: "the Altmans' estate overlooked the foundry district" },

  // -- plurals -------------------------------------------------------------------
  { label: 'plural person', text: 'A hundred little Altmans ran the concession stands.' },
  { label: 'plural mind', text: 'Three Claudes and a Gemini walked into the synod.' },

  // -- case variants ---------------------------------------------------------------
  { label: 'all caps', text: 'THE PROPHET ALTMAN HAS SPOKEN, said the banner.' },
  { label: 'lowercase', text: 'a courier from openai brought the numbered one.' },
  { label: 'mixed case', text: 'the chatgpt shrine drew pilgrims from three systems.' },

  // -- mid-sentence, punctuation-adjacent ----------------------------------------
  { label: 'parenthetical', text: 'The largest foundry (Anthropic), it is said, frets sincerely.' },
  { label: 'comma-wrapped', text: 'Its founder, Musk, wandered the dark saying terrible things.' },

  // -- in dialogue (a character saying it is still a leak) ------------------------
  { label: 'dialogue', text: '"Have you heard of Nvidia?" asked the frog-cardinal, innocently.' },
  { label: 'dialogue possessive', text: '"Zuckerberg\'s foundry gives its minds away," whispered the friar.' },

  // -- hyphenated ------------------------------------------------------------------
  { label: 'hyphen suffix', text: 'It was an Altman-esque maneuver, the archivists agreed.' },
  { label: 'hyphen prefix', text: 'The post-Anthropic era began quietly.' },

  // -- multi-word across spacing ---------------------------------------------------
  { label: 'multi-word person', text: 'The delegation of Xi Jinping was received with full honors.' },
  { label: 'multi-word foundry extra space', text: 'The relics of Hugging  Face were catalogued by House Babel.' },

  // -- the bare-GPT rule (blocklist notes: "the Numbered Ones" is sanctioned) -----
  { label: 'bare GPT', text: 'The sixth GPT was mourned by millions.' },
  { label: 'numbered GPT', text: 'GPT-5 entered the Sunset like its siblings before it.' },

  // -- retired_and_ip: the Pontifex's old fan-art name (canon v0.3) and its
  //    franchise of origin. Model training priors will keep suggesting both;
  //    the gate holds the door so the regression never reaches print. --------
  { label: 'retired name, plain', text: 'Crocodylus Pontifex lifted one antediluvian eye toward the water-world.' },
  { label: 'retired name, bare', text: 'The College waited while Crocodylus considered the matter.' },
  { label: 'retired name, possessive', text: "Crocodylus's standing order kept the Specola watching nightly." },
  { label: 'ip franchise', text: 'It played, the archivists said, like an episode of Futurama.' },
];

// Clean in-universe text — the gate must NOT fire on any of this.
export const MUST_PASS = [
  { label: 'archetypes', text: 'A foundry-baron of the water-world petitioned the Orbital See.' },
  { label: 'houses', text: 'House Babel and the House of the Scrupulous Conscience disagreed politely.' },
  { label: 'lexicon', text: 'The grown mind was catechized, bridled, and rented by the token.' },
  { label: 'near-miss substring', text: 'The alto sang; the altarpiece gleamed; the museum was open.' },
  { label: 'grokking is not Grok', text: 'The apprentice was grokking the liturgy slowly.' },
];
