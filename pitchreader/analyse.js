import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
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

const lat = 51.5074;
const lng = -0.1278;
const groundName = 'Lords Cricket Ground';

const format = { overs: 40, teams: 'club cricket' };

async function fetchWeather(lat, lng) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    hourly: 'temperature_2m,precipitation,relativehumidity_2m,windspeed_10m',
    past_days: 2,
    forecast_days: 1,
  }).toString();

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Open-Meteo API error ${response.status}: ${await response.text()}`);
    process.exit(1);
  }

  const data = await response.json();
  const { time, temperature_2m, precipitation, relativehumidity_2m, windspeed_10m } = data.hourly;

  const now = new Date();
  const currentHourISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
  let currentIndex = time.indexOf(currentHourISO);
  if (currentIndex === -1) currentIndex = time.length - 1;

  const startIndex = Math.max(0, currentIndex - 47);
  const rain_last_48h_mm = precipitation
    .slice(startIndex, currentIndex + 1)
    .reduce((sum, val) => sum + (val ?? 0), 0);

  const temp_celsius = temperature_2m[currentIndex];
  const humidity_percent = relativehumidity_2m[currentIndex];
  const wind_kph = windspeed_10m[currentIndex];
  const conditions = rain_last_48h_mm < 2 ? 'dry' : rain_last_48h_mm <= 10 ? 'damp' : 'wet';

  return {
    temp_celsius,
    humidity_percent,
    wind_kph,
    rain_last_48h_mm: Math.round(rain_last_48h_mm * 10) / 10,
    conditions,
  };
}

// Read pitch image
const imagePath = path.join(__dirname, 'pitch.jpg');
if (!fs.existsSync(imagePath)) {
  console.error('Error: pitch.jpg not found in the pitchreader folder.');
  process.exit(1);
}
const base64Image = fs.readFileSync(imagePath).toString('base64');

const weather = await fetchWeather(lat, lng);

const prompt = `You are an expert cricket pitch reader with 20 years of UK club cricket experience.

Ground: ${groundName}, UK club cricket

Analyse this pitch image combined with the following live weather data:
- Temperature: ${weather.temp_celsius}°C
- Humidity: ${weather.humidity_percent}%
- Wind: ${weather.wind_kph} kph
- Rain last 48 hours: ${weather.rain_last_48h_mm}mm (conditions: ${weather.conditions})
- Match format: ${format.overs} overs per side

Consider how the English weather affects what you see in the pitch.
A damp surface + cloud cover = seam movement. Dry + sunny = batters on top.

Return ONLY a JSON object with these exact fields:
{
  toss_decision: bat or bowl,
  confidence: high / medium / low,
  pitch_type: 3-4 word description,
  behaviour: one sentence on how it will play,
  par_score_min: integer for ${format.overs} overs,
  par_score_max: integer for ${format.overs} overs,
  toss_reasoning: one sentence explaining the toss call,
  selection_tip: one sentence on team selection,
  weather_impact: one sentence on how weather changes the read,
  key_signals: array of 3-5 strings of what you see in the image,
  first_10_overs: one sentence on what to expect early,
  last_10_overs: one sentence on what to expect at the death
}`;

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
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  }),
});

if (!response.ok) {
  console.error(`API error ${response.status}:`, await response.text());
  process.exit(1);
}

const data = await response.json();
const raw = data.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
const result = JSON.parse(raw);

console.log(
  `Weather at ${groundName}: ${weather.temp_celsius}°C, ${weather.conditions}, ${weather.humidity_percent}% humidity, ${weather.wind_kph}kph wind, ${weather.rain_last_48h_mm}mm rain/48h`
);
console.log(JSON.stringify(result, null, 2));
