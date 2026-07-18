// tests/illustration/tune.mjs — style tuning harness (not a unit test)
//
// Generates real plates against fal so a human (and the Editor) can LOOK at the
// clergy and judge: alien enough? illustrated, not photographic? Saves each to
// reports/ with a manifest. Reads FAL_KEY from the Flamekeeper .env, as briefed.
//
// Usage: node tests/illustration/tune.mjs <styleTag>
//   styleTag names the run (e.g. v1, v2) so rejected batches stay on the shelf.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFalClient } from '../../pipeline/lib/fal.mjs';
import { composeIlluminationPrompt, HOUSE_STYLE } from '../../pipeline/stages/illuminator.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORTS = join(HERE, 'reports');
mkdirSync(REPORTS, { recursive: true });

const styleTag = process.argv[2] ?? 'v1';

// Read FAL_KEY from the Flamekeeper env (per the build brief).
const ENV_PATH = 'c:/Users/Zapper/OneDrive/Desktop/Flamekeeper/therealcat-flamekeeper/.env';
const envText = readFileSync(ENV_PATH, 'utf8');
const FAL_KEY = (envText.match(/^FAL_KEY=(.+)$/m)?.[1] ?? '').trim();
if (!FAL_KEY) throw new Error('FAL_KEY not found in Flamekeeper .env');

// Three canonical scenes, derived through the REAL prompt composer from
// representative firewalled fiction, plus the style suffix under test.
const style = process.env.STYLE_OVERRIDE || HOUSE_STYLE;
const scenes = [
  {
    name: 'college',
    title: 'The College in Session',
    body: 'The seven cardinals convened beneath the vaulted glass. The frog-cardinal of the Seven-Sister See spoke first, and the tardigrade-monks of the Lich See grumbled from their pews. The machine-cardinal of House Babel filed the minutes as they were spoken.',
  },
  {
    name: 'pontiff-telescope',
    title: 'The Pontifex at the Long Lens',
    body: 'Silex, the saurian Pontifex, bent a patient scaled face to the great telescope and regarded the small quick water-world. We find them charming, the Pontifex said, and We are not yet done watching.',
  },
  {
    name: 'dispatch-cosmic',
    title: 'News Arrives from the Water-World',
    body: 'A courier-drone descended through the incense of the Orbital See, bearing dispatches from the periphery. The candle-lighters gathered. Beyond the arches, a ringed planet turned, and the Feast of the Sunset Mind was proclaimed.',
  },
];

const fal = createFalClient({ apiKey: FAL_KEY });
const manifest = { styleTag, style, generatedAt: new Date().toISOString(), plates: [] };

for (const scene of scenes) {
  const prompt = composeIlluminationPrompt({ title: scene.title, body: scene.body, styleSuffix: style });
  process.stdout.write(`generating ${scene.name}… `);
  try {
    const { bytes, seed, costUsd } = await fal.generateImage({ prompt });
    const file = `${styleTag}-${scene.name}.jpg`;
    writeFileSync(join(REPORTS, file), bytes);
    manifest.plates.push({ name: scene.name, file, seed, costUsd, prompt });
    console.log(`ok (${bytes.length} bytes, seed ${seed})`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    manifest.plates.push({ name: scene.name, error: err.message, prompt });
  }
}

manifest.totalUsd = fal.ledger.totalUsd;
writeFileSync(join(REPORTS, `${styleTag}-manifest.json`), JSON.stringify(manifest, null, 2));
console.log(`\ntotal wage: $${fal.ledger.totalUsd}\nmanifest: reports/${styleTag}-manifest.json`);
