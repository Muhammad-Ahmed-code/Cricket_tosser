/**
 * Validation script for the new anti-bias prompt.
 *
 * Runs pitch.jpg through the new prompt 3x (consistency check) and once
 * through the old prompt (before/after comparison). pitch.jpg shows a
 * green outfield with a prepared pitch strip showing some wear — a genuinely
 * ambiguous image that the old prompt handled inconsistently.
 *
 * Usage:  node validate-prompt.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const imagePath = path.join(__dirname, 'pitch.jpg');
const base64Image = fs.readFileSync(imagePath).toString('base64');

// Representative weather matching the Jul-22 cluster (dry UK summer day, 0mm rain)
const WEATHER = {
  temp_celsius: 25.1,
  humidity_percent: 40,
  wind_kph: 12.2,
  conditions: 'dry',
  rain_last_48h_mm: 0,
  rain_last_7days_mm: 0,
  forecast_afternoon_temp: 19.1,
  drying_out: false,
  rain_probability_percent: 0,
  expected_rainfall_mm: 0,
  forecast_conditions: 'cloudy',
  match_likely_affected: false,
};
const OVERS = 50;
const GROUND = 'Welwyn Hatfield, Hertfordshire';

// ─── OLD PROMPT (verbatim from production before this change) ─────────────────
function buildOldPrompt() {
  return `You are an expert cricket pitch reader with 20 years of UK club cricket experience.
You will be shown 1 photos of the same pitch taken from different angles — full length views from both ends plus close-up surface shots.

CRITICAL INSTRUCTION:
The PHOTOS are your PRIMARY source of truth. What you can physically see in the images must drive your assessment. Do not invent or assume surface characteristics that are not visible in the photos.

Weather data is SECONDARY CONTEXT only — it tells you how the existing surface will behave, not what the surface looks like. For example:
- If photos show a DRY DUSTY pitch but weather is wet → the pitch is dry and dusty, but rain may have added some surface moisture not yet visible
- If photos show GREEN GRASSY pitch and weather is dry → seam movement likely early but pitch may play better than expected
- If photos show CRACKED DRY pitch and weather is cold/damp → cracks suggest spin later, damp air may help swing early
- Never describe the pitch as "green" or "grassy" if the photos show brown/dry surface
- Never describe "damp sheen" or "moisture" if photos show a dry dusty surface
- Always describe what you ACTUALLY SEE first, then adjust for weather second

Ground: ${GROUND}, UK club cricket
Match format: ${OVERS} overs per side

WEATHER CONTEXT (secondary — use to adjust behaviour prediction only):
- Temperature: ${WEATHER.temp_celsius}°C
- Humidity: ${WEATHER.humidity_percent}%
- Wind: ${WEATHER.wind_kph} kph
- Conditions: ${WEATHER.conditions}
- Rain last 48 hours: ${WEATHER.rain_last_48h_mm}mm
- Rain last 7 days: ${WEATHER.rain_last_7days_mm}mm
- Afternoon forecast: ${WEATHER.forecast_afternoon_temp}°C
- Pitch drying out during match: NO — conditions stay similar throughout

Today's match forecast (10am–7pm local):
- Rain probability: ${WEATHER.rain_probability_percent}%
- Expected rainfall: ${WEATHER.expected_rainfall_mm}mm
- Conditions: ${WEATHER.forecast_conditions}
- Match likely rain-affected: No

WHAT TO ASSESS FROM PHOTOS (be specific about what you see):
1. Grass coverage — thick/patchy/bare/none
2. Surface colour — green/brown/yellow/mixed
3. Visible cracks — none/hairline/significant/wide open
4. Moisture signs — sheen/dark patches/dry/dusty
5. Wear patterns — fresh/some wear/heavily worn/crumbling
6. Surface hardness — looks hard/medium/soft based on preparation

Then combine what you see with the weather context to predict behaviour.

## Required Output

Return ONLY a JSON object with this exact top-level structure — no markdown, no explanation, just raw JSON:

{
  "general": {
    "toss_decision": "bat or bowl",
    "confidence": "high / medium / low",
    "confidence_pct": 68,
    "pitch_type": "describe what you ACTUALLY SEE in 3-4 words",
    "behaviour": "one sentence based primarily on visible surface",
    "par_score_min": 220,
    "par_score_max": 260,
    "toss_reasoning": "explain using BOTH what you see AND weather — do NOT mention squad at all",
    "selection_tip": "one generic sentence on team selection based on pitch only",
    "weather_impact": "one sentence on how weather ADJUSTS the read — not replaces it",
    "key_signals": ["list ONLY things you can actually see in the photos — 3-5 items"],
    "first_10_overs": "one sentence based on visible surface + weather",
    "last_10_overs": "one sentence on expected deterioration",
    "squad_rating": null,
    "squad_verdict": null,
    "squad_strengths": [],
    "squad_weakness": null,
    "squad_suggestion": null,
    "rain_impact": null
  },
  "team": null
}

The "general" analysis must be based on pitch and weather ONLY.
RAIN IMPACT RULES: rain_probability_percent is 0% so rain_impact must be null.`;
}

// ─── NEW PROMPT (matches updated edge function) ───────────────────────────────
function buildNewPrompt() {
  return `You are an expert cricket pitch reader with 20 years of UK club cricket experience.
You will be shown 1 photos of the same pitch taken from different angles — full length views from both ends plus close-up surface shots.

CRITICAL INSTRUCTION:
The PHOTOS are your PRIMARY source of truth. What you can physically see in the images must drive your assessment. Do not invent or assume surface characteristics that are not visible in the photos.

Weather data is SECONDARY CONTEXT only — it tells you how the existing surface will behave, not what the surface looks like. For example:
- If photos show a DRY DUSTY pitch but weather is wet → pitch is dry and dusty (describe it as such). Rain adds humidity/swing context but does NOT change the pitch read to "green" or "damp"
- If photos show GREEN GRASSY pitch and weather is dry → seam movement early is STILL the correct read. Dry weather adjusts confidence slightly downward; it does NOT reverse the bowl-first call
- If photos show CRACKED DRY pitch and weather is cold/damp → cracks suggest spin later, damp air may help swing early. Still bat first on a dry cracked surface
- Never describe the pitch as "green" or "grassy" if the photos show brown/dry surface
- Never describe "damp sheen" or "moisture" if photos show a dry dusty surface
- Always describe what you ACTUALLY SEE first, then adjust for weather second

BOWL-FIRST TRIGGERS — these pitch signals should produce a "bowl" recommendation:
1. GREEN GRASS COVERAGE: Photos show ≥40% green, upright grass — especially in good-length zones → BOWL. New ball will move laterally and off the pitch
2. MOISTURE SHEEN: Visible wet sheen, dark damp patches, or soft surface appearance → BOWL. Ball will seam and swing
3. GREEN + OVERCAST + RECENT RAIN: Green surface combined with overcast skies and rain in last 48h → BOWL (high confidence). Classic UK bowling conditions
4. PRE-EXISTING WEAR AT BOTH ENDS: Heavily crumbled, bare patches from previous matches at good-length zones of BOTH ends → BOWL. Variable bounce from ball one; batting is hardest early on a worn surface

BAT-FIRST TRIGGERS — these pitch signals should produce a "bat" recommendation:
1. DRY/BROWN/GRASSLESS: Predominantly brown, bare, hard surface with little green grass → BAT. Surface plays truest early and deteriorates later
2. FIRM AND ROLLED: Looks hard, consistent, well-prepared with even covering of short dry grass → BAT
3. CRACKED AND DRY: Visible cracks, no moisture, brown/yellow dominant — spin becomes dangerous later → BAT first to score while pitch is true
4. PATCHY WITH WEAR ON ONE END ONLY: Single-end wear is not enough to justify bowling first; surface still plays reasonably true → BAT

CONTRASTIVE CALIBRATION EXAMPLES (use these to calibrate your decision):
- "Lush even green coverage across full length, upright grass, fresh preparation, no cracks" → BOWL (high confidence ~80%)
- "90% green coverage, overcast sky visible, surface appears soft, 20mm rain last 48h" → BOWL (high confidence ~85%)
- "Green-brown mixed with moisture sheen visible in close-up, surface looks soft underfoot" → BOWL (medium confidence ~70%)
- "Brown, dry, sparse dying grass, hard-looking compacted surface, 0mm rain 7 days" → BAT (high confidence ~78%)
- "Cracked dry surface, yellow/brown, patchy sparse grass, baked appearance" → BAT (high confidence ~82%)

NO PITCH VISIBLE: If you cannot identify a cricket pitch in the photos, set toss_decision to "bat", confidence_pct to 50, and state clearly in toss_reasoning that no valid pitch assessment is possible. Do NOT substitute weather data as pitch evidence and do not apply a weather-based default.

Ground: ${GROUND}, UK club cricket
Match format: ${OVERS} overs per side

WEATHER CONTEXT (secondary — use to adjust behaviour prediction only):
- Temperature: ${WEATHER.temp_celsius}°C
- Humidity: ${WEATHER.humidity_percent}%
- Wind: ${WEATHER.wind_kph} kph
- Conditions: ${WEATHER.conditions}
- Rain last 48 hours: ${WEATHER.rain_last_48h_mm}mm
- Rain last 7 days: ${WEATHER.rain_last_7days_mm}mm
- Afternoon forecast: ${WEATHER.forecast_afternoon_temp}°C
- Pitch drying out during match: NO — conditions stay similar throughout

Today's match forecast (10am–7pm local):
- Rain probability: ${WEATHER.rain_probability_percent}%
- Expected rainfall: ${WEATHER.expected_rainfall_mm}mm
- Conditions: ${WEATHER.forecast_conditions}
- Match likely rain-affected: No

## MANDATORY TOSS DECISION PROCESS — follow this order strictly, do not skip steps

PHASE 1 — VISUAL EXTRACTION (output these in pitch_signals before anything else):
Read the photos and extract each of these signals explicitly:
- grass_coverage_pct: estimate 0–100 (0 = bare soil, 100 = fully lush green)
- surface_colour: green / yellow-green / brown / mixed (describe exactly what you see)
- visible_cracks: none / hairline / significant / wide open
- moisture_signs: sheen / dark patches / dry / dusty / none
- wear_patterns: fresh / some wear / heavily worn / crumbling
- surface_hardness: hard / medium / soft (based on preparation and visual appearance)
- footmarks: none / light / significant (pre-existing wear at good-length zones from previous matches)

PHASE 2 — APPLY TRIGGERS (do this BEFORE writing toss_decision):
Match your Phase 1 observations against the BOWL-FIRST TRIGGERS and BAT-FIRST TRIGGERS above.
Write toss_reasoning first. End toss_reasoning with: "Therefore: [bat/bowl]."
Only then set toss_decision to match that conclusion.

PHASE 3 — WEATHER ADJUSTMENT:
Weather adjusts CONFIDENCE ONLY — it does not flip the bat/bowl decision.
- Green pitch + heavy rain → bowl, confidence_pct +5 to +10
- Green pitch + dry sunny → bowl, confidence_pct −5 (still bowl)
- Dry pitch + overcast → bat, confidence_pct −5 (still bat, modest swing possible)
- Rain probability > 50% → DLS adjustment as per rain_impact field; may push toward bowl if pitch is borderline
- Weather NEVER converts a clear bat pitch to bowl or vice versa.

## Required Output

Return ONLY a JSON object with this exact top-level structure — no markdown, no explanation, just raw JSON:

{
  "general": {
    "pitch_signals": {
      "grass_coverage_pct": "estimated 0-100",
      "surface_colour": "green / yellow-green / brown / mixed",
      "visible_cracks": "none / hairline / significant / wide open",
      "moisture_signs": "sheen / dark patches / dry / dusty / none",
      "wear_patterns": "fresh / some wear / heavily worn / crumbling",
      "surface_hardness": "hard / medium / soft",
      "footmarks": "none / light / significant"
    },
    "pitch_type": "describe what you ACTUALLY SEE in 3-4 words",
    "behaviour": "one sentence based primarily on visible surface",
    "key_signals": ["list ONLY things you can actually see in the photos — 3-5 items"],
    "first_10_overs": "one sentence based on visible surface + weather",
    "last_10_overs": "one sentence on expected deterioration",
    "toss_reasoning": "explain what you see (Phase 1), which triggers matched (Phase 2), then how weather adjusts (Phase 3). End with 'Therefore: [bat/bowl].'",
    "toss_decision": "bat or bowl",
    "confidence": "high / medium / low",
    "confidence_pct": 68,
    "par_score_min": 220,
    "par_score_max": 260,
    "selection_tip": "one generic sentence on team selection based on pitch only",
    "weather_impact": "one sentence on how weather ADJUSTS confidence — not the decision itself",
    "squad_rating": null,
    "squad_verdict": null,
    "squad_strengths": [],
    "squad_weakness": null,
    "squad_suggestion": null,
    "rain_impact": null
  },
  "team": null
}

The "general" analysis must be based on pitch and weather ONLY.
RAIN IMPACT RULES: rain_probability_percent is 0% so rain_impact must be null.`;
}

// ─── Call Claude ──────────────────────────────────────────────────────────────
async function callClaude(systemPrompt, label) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Photo 1 of 1 - Full length view' },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  let text = data.content[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { label, error: `JSON parse failed: ${e.message}`, raw: text.slice(0, 300) };
  }

  const g = parsed.general ?? parsed;
  return {
    label,
    toss_decision: g.toss_decision,
    confidence_pct: g.confidence_pct,
    pitch_signals: g.pitch_signals ?? null,
    key_signals: g.key_signals,
    toss_reasoning_tail: (g.toss_reasoning ?? '').slice(-200),
    toss_reasoning_full: g.toss_reasoning ?? '',
    pitch_type: g.pitch_type,
  };
}

// ─── Synthetic green pitch test (text-only — no photo available) ──────────────
// Sends the new prompt with NO image, but with a detailed text description of
// a classic green English pitch. Tests that the trigger language fires correctly
// when the model cannot infer from a real photo.
async function callClaudeTextOnly(systemPrompt, pitchDescription, label) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `[PITCH PHOTO DESCRIPTION — use this as if you can see the photos]\n${pitchDescription}\n\nApply the mandatory toss decision process to these visual signals.`,
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  let text = data.content[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { label, error: `JSON parse failed: ${e.message}`, raw: text.slice(0, 400) };
  }

  const g = parsed.general ?? parsed;
  return {
    label,
    toss_decision: g.toss_decision,
    confidence_pct: g.confidence_pct,
    pitch_signals: g.pitch_signals ?? null,
    toss_reasoning_full: g.toss_reasoning ?? '',
    pitch_type: g.pitch_type,
  };
}

// ─── Run tests ────────────────────────────────────────────────────────────────
console.log('='.repeat(70));
console.log('CRICKET TOSSER — PROMPT VALIDATION');
console.log('Image: pitch.jpg (green outfield, prepared pitch strip with some wear)');
console.log('Weather: dry, 0mm rain, 40% humidity, 25°C, 0% rain probability');
console.log('='.repeat(70));
console.log('');

// OLD prompt: 1 call
console.log('── OLD PROMPT (1 call, before/after baseline) ──────────────────────────');
const oldResult = await callClaude(buildOldPrompt(), 'OLD');
console.log(`  Decision:      ${oldResult.toss_decision}`);
console.log(`  Confidence %:  ${oldResult.confidence_pct}`);
console.log(`  Pitch type:    ${oldResult.pitch_type}`);
console.log(`  Key signals:   ${JSON.stringify(oldResult.key_signals)}`);
console.log(`  Reasoning tail: "...${oldResult.toss_reasoning_tail}"`);
console.log('');

// NEW prompt: 3 calls to test consistency
console.log('── NEW PROMPT (3 calls — consistency test) ─────────────────────────────');
const newResults = [];
for (let i = 1; i <= 3; i++) {
  process.stdout.write(`  Run ${i}/3... `);
  const r = await callClaude(buildNewPrompt(), `NEW-${i}`);
  newResults.push(r);
  console.log(`${r.toss_decision} (${r.confidence_pct}%)`);
}

console.log('');
console.log('── NEW PROMPT: DETAILED OUTPUT ─────────────────────────────────────────');
for (const r of newResults) {
  console.log(`\n  [${r.label}]`);
  if (r.error) { console.log(`  ERROR: ${r.error}\n  RAW: ${r.raw}`); continue; }
  console.log(`  Decision:      ${r.toss_decision}`);
  console.log(`  Confidence %:  ${r.confidence_pct}`);
  console.log(`  Pitch type:    ${r.pitch_type}`);
  if (r.pitch_signals) {
    console.log('  Pitch signals (Phase 1 output):');
    for (const [k, v] of Object.entries(r.pitch_signals)) {
      console.log(`    ${k.padEnd(22)}: ${v}`);
    }
  }
  console.log(`  Key signals:   ${JSON.stringify(r.key_signals)}`);
  console.log(`  Full reasoning: "${r.toss_reasoning_full}"`);
}

// ─── Green pitch bowl-trigger test (text-only synthetic) ─────────────────────
console.log('── GREEN PITCH BOWL-TRIGGER TEST (text-only synthetic) ──────────────────');
console.log('  NOTE: No green pitch photos exist in storage. This test sends a text');
console.log('  description of a green UK pitch to verify the trigger language fires.');
console.log('');

const GREEN_PITCH_DESCRIPTION = `
Photo 1 (full length from End A): Lush, upright green grass covers approximately 80% of the full pitch length. The grass is even and healthy, standing 3-4mm high. No visible cracks. Surface looks soft and recently watered. Slight moisture sheen visible in the good-length zone near End A.
Photo 2 (full length from End B): From this end the pitch looks equally green and grassy. Good-length area at End B also shows upright healthy green grass with the same moisture sheen. No wear patches at this end.
Photo 3 (close-up surface): Close-up confirms thick green grass with moisture visible between the blades. Surface looks soft underfoot — you can see slight compression of grass from previous footfall but no bare soil exposed. No cracks.
Photo 4 (good-length zone): Green grass is upright and thick in the good-length area. The seam line of previous deliveries shows slight pressing of grass but the surface binds together firmly. Moisture sheen clearly visible.
Overall: 80% green grass coverage, even distribution, both good-length zones have green grass with moisture sheen, soft-looking surface, overcast light in photos.
`.trim();

// Use weather matching a wet UK day: recent rain, overcast
const greenPitchNewPrompt = buildNewPrompt().replace(
  `- Rain last 48 hours: ${WEATHER.rain_last_48h_mm}mm`,
  `- Rain last 48 hours: 18mm`
).replace(
  `- Conditions: ${WEATHER.conditions}`,
  `- Conditions: damp`
).replace(
  `- Pitch drying out during match: NO — conditions stay similar throughout`,
  `- Pitch drying out during match: NO — overcast, conditions stay similar throughout`
).replace(
  `- Conditions: ${WEATHER.forecast_conditions}`,
  `- Conditions: overcast with light rain possible`
);

process.stdout.write('  Running green pitch test... ');
const greenResult = await callClaudeTextOnly(greenPitchNewPrompt, GREEN_PITCH_DESCRIPTION, 'GREEN-SYNTHETIC');
console.log(`${greenResult.toss_decision} (${greenResult.confidence_pct}%)`);
console.log('');
console.log(`  [GREEN-SYNTHETIC]`);
if (greenResult.error) {
  console.log(`  ERROR: ${greenResult.error}\n  RAW: ${greenResult.raw}`);
} else {
  console.log(`  Decision:      ${greenResult.toss_decision}`);
  console.log(`  Confidence %:  ${greenResult.confidence_pct}`);
  console.log(`  Pitch type:    ${greenResult.pitch_type}`);
  if (greenResult.pitch_signals) {
    console.log('  Pitch signals:');
    for (const [k, v] of Object.entries(greenResult.pitch_signals)) {
      console.log(`    ${k.padEnd(22)}: ${v}`);
    }
  }
  console.log(`  Full reasoning: "${greenResult.toss_reasoning_full}"`);
  console.log('');
  const bowlFired = greenResult.toss_decision === 'bowl';
  console.log(`  Bowl trigger fired?  ${bowlFired ? 'YES ✓' : 'NO — trigger did NOT fire'}`);
}

console.log('');
console.log('── SUMMARY ─────────────────────────────────────────────────────────────');
const oldDecision = oldResult.toss_decision;
const newDecisions = newResults.map(r => r.toss_decision);
const allSame = newDecisions.every(d => d === newDecisions[0]);
console.log(`  [Consistency test — pitch.jpg, dry worn surface]`);
console.log(`  OLD prompt decision:          ${oldDecision}`);
console.log(`  NEW prompt decisions (3 runs): ${newDecisions.join(', ')}`);
console.log(`  Consistency (all same?):      ${allSame ? 'YES ✓' : 'NO — still inconsistent'}`);
if (allSame && newDecisions[0] !== oldDecision) {
  console.log(`  Decision flipped:             ${oldDecision} → ${newDecisions[0]}`);
} else if (allSame) {
  console.log(`  Same decision, now with explicit Phase 1/2/3 reasoning each time`);
}
console.log('');
console.log(`  [Bowl-trigger test — synthetic green pitch description]`);
if (!greenResult.error) {
  console.log(`  Green pitch decision: ${greenResult.toss_decision} (${greenResult.confidence_pct}%)`);
  console.log(`  Bowl trigger fired?   ${greenResult.toss_decision === 'bowl' ? 'YES ✓' : 'NO — trigger did NOT fire'}`);
}
