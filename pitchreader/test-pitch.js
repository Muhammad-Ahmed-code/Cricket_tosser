import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the same folder as this script
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const imagePath = path.join(__dirname, 'pitch.jpg');
if (!fs.existsSync(imagePath)) {
  console.error('Error: pitch.jpg not found in the pitchreader folder.');
  process.exit(1);
}

const imageData = fs.readFileSync(imagePath);
const base64Image = imageData.toString('base64');

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system:
      'You are an expert cricket pitch reader with 20 years of experience in UK club cricket. Analyse the pitch image and return ONLY a JSON object with these exact fields: toss_decision (bat/bowl), confidence (high/medium/low), pitch_type (describe in 3-4 words), behaviour (one sentence), par_score_min (integer), par_score_max (integer), overs (integer), selection_tip (one sentence), weather_impact (one sentence), key_signals (array of 3-5 strings describing what you see).',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'Analyse this cricket pitch and return the JSON object as instructed.',
          },
        ],
      },
    ],
  }),
});

if (!response.ok) {
  const error = await response.text();
  console.error(`API error ${response.status}:`, error);
  process.exit(1);
}

const data = await response.json();
const raw = data.content[0].text.trim();

// Strip markdown code fences if present
const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

const result = JSON.parse(jsonText);
console.log(JSON.stringify(result, null, 2));
