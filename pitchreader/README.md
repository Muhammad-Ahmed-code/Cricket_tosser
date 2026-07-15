## PitchReader — Build Log

### What we have built

- **test-pitch.js** — Standalone script that reads `pitch.jpg`, converts it to base64, and sends it to Claude with a pitch-reading system prompt. Returns a JSON report with toss decision, par score, and pitch behaviour. Good for testing the vision pipeline in isolation.
- **weather.js** — Fetches live weather from the Open-Meteo API (no API key required) for a given lat/lng. Returns a clean summary object: temperature, humidity, wind speed, total rainfall over the past 48 hours, and a derived conditions string (dry / damp / wet).
- **analyse.js** — The combined pipeline. Fetches live weather, reads the pitch image, and sends both to Claude in a single message. Claude reasons about how the weather modifies what it sees in the pitch. Outputs a full captain's report as JSON.

---

### The pipeline

Photo + GPS coordinates go in. Live weather is fetched. Claude analyses both. Captain's report comes out.

```
pitch.jpg + lat/lng
      │
      ├── Open-Meteo API → live weather summary
      │
      └── Claude (vision + weather prompt) → JSON report
```

---

### Proven results

| Ground | Temp | Rain 48h | Humidity | Toss | Par Score |
|--------|------|----------|----------|------|-----------|
| Liverpool CC | 10.6°C | 3.6mm | 63% | Bowl | 180–210 |
| Lords Cricket Ground | 14.7°C | 0.4mm | 50% | Bat | 240–270 |

---

### JSON output shape

```json
{
  "toss_decision": "bowl",
  "confidence": "high",
  "pitch_type": "Damp green seamer",
  "behaviour": "One sentence on how it will play.",
  "par_score_min": 180,
  "par_score_max": 210,
  "toss_reasoning": "One sentence explaining the toss call.",
  "selection_tip": "One sentence on team selection.",
  "weather_impact": "One sentence on how weather changes the read.",
  "key_signals": [
    "Signal one",
    "Signal two",
    "Signal three"
  ],
  "first_10_overs": "One sentence on what to expect early.",
  "last_10_overs": "One sentence on what to expect at the death."
}
```

---

### What is next

- Supabase project setup
- Edge Function to expose this as a real API endpoint
- Expo React Native app
- Camera screen — captain photographs the pitch
- Results screen — captain sees the report

---

### How to run

#### Standalone pipeline (Node scripts)

```bash
node pitchreader/analyse.js
```

Requires `pitch.jpg` in the `pitchreader/` folder and `ANTHROPIC_API_KEY` set in `pitchreader/.env`.

---

#### Mobile app (Expo / React Native)

**Prerequisites**

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- iOS: Xcode + Simulator, or the [Expo Go](https://expo.dev/client) app on a physical device
- Android: Android Studio + emulator, or the Expo Go app on a physical device

**Steps**

```bash
# 1. Install dependencies
cd pitchreader/app
npm install

# 2. Start the dev server
npm start
```

Then press `i` to open in an iOS simulator, `a` for Android, or scan the QR code with the Expo Go app.

**Run on a specific platform**

```bash
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Browser
```
