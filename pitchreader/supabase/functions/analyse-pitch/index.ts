import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type Squad = {
  seamers: number;
  fastAllRounders: number;
  spinners: number;
  spinAllRounders: number;
  batters: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const photoLabels = [
  "Photo 1 of 4 - Full length view from End A",
  "Photo 2 of 4 - Full length view from End B",
  "Photo 3 of 4 - Close-up of surface and cracks",
  "Photo 4 of 4 - Close-up of good length area",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Request received: ${req.method} ${req.url}`);

  try {
    // --- Step 1: Parse request body ---
    let body: { imageBase64Array: string[]; lat: number; lng: number; groundName: string; overs: number; squad?: Squad | null };
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[${requestId}] FAIL body parse:`, (e as Error).message);
      return new Response(JSON.stringify({ error: "Invalid JSON body", detail: (e as Error).message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64Array, lat, lng, groundName, overs, squad } = body;
    console.log(`[${requestId}] Body parsed — images: ${imageBase64Array?.length}, ground: ${groundName}, overs: ${overs}, lat: ${lat}, lng: ${lng}`);

    if (!imageBase64Array?.length) {
      console.error(`[${requestId}] FAIL no images provided`);
      return new Response(JSON.stringify({ error: "imageBase64Array is required and must not be empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Step 2: Fetch weather ---
    console.log(`[${requestId}] Fetching weather for lat=${lat} lng=${lng}`);
    let weatherData: any;
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation,relativehumidity_2m,windspeed_10m&past_days=7&forecast_days=1`
      );
      if (!weatherRes.ok) throw new Error(`Open-Meteo HTTP ${weatherRes.status}`);
      weatherData = await weatherRes.json();
      console.log(`[${requestId}] Weather OK — hourly data points: ${weatherData?.hourly?.temperature_2m?.length}`);
    } catch (e) {
      console.error(`[${requestId}] FAIL weather fetch:`, (e as Error).message);
      throw e;
    }

    const currentHour = new Date().getUTCHours();
    const currentIndex = 168 + currentHour;
    const temp = weatherData.hourly.temperature_2m[currentIndex];
    const humidity = weatherData.hourly.relativehumidity_2m[currentIndex];
    const wind = weatherData.hourly.windspeed_10m[currentIndex];

    const rain_last_48h_mm = Math.round(
      weatherData.hourly.precipitation.slice(144, 192).reduce((a: number, b: number) => a + b, 0) * 10
    ) / 10;
    const rain_last_7days_mm = Math.round(
      weatherData.hourly.precipitation.slice(0, 168).reduce((a: number, b: number) => a + b, 0) * 10
    ) / 10;

    const afternoonIndex = currentIndex + 6;
    const forecast_afternoon_temp = Math.round(
      (weatherData.hourly.temperature_2m[afternoonIndex] ?? temp) * 10
    ) / 10;

    const drying_out = forecast_afternoon_temp - temp >= 3;
    const conditions = rain_last_48h_mm < 2 ? "dry" : rain_last_48h_mm < 10 ? "damp" : "wet";

    const weather = {
      temp_celsius: Math.round(temp * 10) / 10,
      humidity_percent: humidity,
      wind_kph: wind,
      rain_last_48h_mm,
      rain_last_7days_mm,
      forecast_afternoon_temp,
      drying_out,
      conditions,
    };
    console.log(`[${requestId}] Weather computed:`, JSON.stringify(weather));

    // --- Step 3: Build Claude content blocks ---
    const imageBlocks = imageBase64Array.flatMap((base64: string, i: number) => {
      const label = photoLabels[i] ?? `Photo ${i + 1} of ${imageBase64Array.length}`;
      const approxBytes = base64.length * 0.75;
      console.log(`[${requestId}] Image ${i + 1}: ~${Math.round(approxBytes / 1024)}KB`);
      return [
        { type: "text", text: label },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
      ];
    });

    imageBlocks.push({
      type: "text",
      text: `You are an expert cricket pitch reader with 20 years of UK club cricket experience.
You will be shown ${imageBase64Array.length} photos of the same pitch taken from different angles — full length views from both ends plus close-up surface shots.

CRITICAL INSTRUCTION:
The PHOTOS are your PRIMARY source of truth. What you can physically see in the images must drive your assessment. Do not invent or assume surface characteristics that are not visible in the photos.

Weather data is SECONDARY CONTEXT only — it tells you how the existing surface will behave, not what the surface looks like. For example:
- If photos show a DRY DUSTY pitch but weather is wet → the pitch is dry and dusty, but rain may have added some surface moisture not yet visible
- If photos show GREEN GRASSY pitch and weather is dry → seam movement likely early but pitch may play better than expected
- If photos show CRACKED DRY pitch and weather is cold/damp → cracks suggest spin later, damp air may help swing early
- Never describe the pitch as "green" or "grassy" if the photos show brown/dry surface
- Never describe "damp sheen" or "moisture" if photos show a dry dusty surface
- Always describe what you ACTUALLY SEE first, then adjust for weather second

Ground: ${groundName}, UK club cricket
Match format: ${overs} overs per side

WEATHER CONTEXT (secondary — use to adjust behaviour prediction only):
- Temperature: ${weather.temp_celsius}°C
- Humidity: ${weather.humidity_percent}%
- Wind: ${weather.wind_kph} kph
- Conditions: ${weather.conditions}
- Rain last 48 hours: ${weather.rain_last_48h_mm}mm
- Rain last 7 days: ${weather.rain_last_7days_mm}mm
- Afternoon forecast: ${weather.forecast_afternoon_temp}°C
- Pitch drying out during match: ${weather.drying_out ? "YES — pitch will firm up as afternoon heats up" : "NO — conditions stay similar throughout"}

${squad ? `SQUAD COMPOSITION:
Pace bowling options:
- Pure seamers: ${squad.seamers}
- Fast all-rounders (bat + bowl pace): ${squad.fastAllRounders}
- Total pace options: ${squad.seamers + squad.fastAllRounders}

Spin bowling options:
- Pure spinners: ${squad.spinners}
- Spin all-rounders (bat + bowl spin): ${squad.spinAllRounders}
- Total spin options: ${squad.spinners + squad.spinAllRounders}

Batting depth:
- Specialist batters: ${squad.batters}
- Batting all-rounders (both types): ${squad.fastAllRounders + squad.spinAllRounders}
- Total batting options: ${squad.batters + squad.fastAllRounders + squad.spinAllRounders}

Total squad size: ${squad.seamers + squad.fastAllRounders + squad.spinners + squad.spinAllRounders + squad.batters}

Rate this squad specifically for the pitch and conditions visible.
Key questions to answer:
- Does total pace options suit the surface? (green/damp/grassy = more pace needed)
- Does total spin options suit the surface? (dry/dusty/cracked = more spin needed)
- Is batting depth sufficient for the par score on this pitch?
- Which type of bowling does this pitch reward most?
- Is the squad balanced or lopsided for these specific conditions?` : 'No squad provided.'}

WHAT TO ASSESS FROM PHOTOS (be specific about what you see):
1. Grass coverage — thick/patchy/bare/none
2. Surface colour — green/brown/yellow/mixed
3. Visible cracks — none/hairline/significant/wide open
4. Moisture signs — sheen/dark patches/dry/dusty
5. Wear patterns — fresh/some wear/heavily worn/crumbling
6. Surface hardness — looks hard/medium/soft based on preparation

Then combine what you see with the weather context to predict behaviour.

Return ONLY a JSON object:
{
  "toss_decision": "bat or bowl",
  "confidence": "high / medium / low",
  "pitch_type": "describe what you ACTUALLY SEE in 3-4 words",
  "behaviour": "one sentence based primarily on visible surface",
  "par_score_min": integer for ${overs} overs,
  "par_score_max": integer for ${overs} overs,
  "toss_reasoning": "explain using BOTH what you see AND weather",
  "selection_tip": "one sentence on team selection",
  "weather_impact": "one sentence on how weather ADJUSTS the read — not replaces it",
  "key_signals": ["list ONLY things you can actually see in the photos — 3-5 items"],
  "first_10_overs": "one sentence based on visible surface + weather",
  "last_10_overs": "one sentence on expected deterioration",
  ${squad ? `"squad_rating": integer out of 10,
  "squad_verdict": "one sentence overall verdict on squad fit for this pitch",
  "squad_strengths": ["array of 1-3 things the squad does well for this pitch"],
  "squad_weakness": "the single most important gap or concern",
  "squad_suggestion": "one specific actionable change — e.g. play an extra spinner"` : `"squad_rating": null,
  "squad_verdict": null,
  "squad_strengths": [],
  "squad_weakness": null,
  "squad_suggestion": null`}
}`,
    });

    // --- Step 4: Call Claude ---
    console.log(`[${requestId}] Calling Claude with ${imageBase64Array.length} images`);
    let claudeData: any;
    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1500,
          messages: [{ role: "user", content: imageBlocks }],
        }),
      });
      claudeData = await claudeRes.json();
      console.log(`[${requestId}] Claude HTTP status: ${claudeRes.status}, stop_reason: ${claudeData?.stop_reason}, error: ${claudeData?.error?.message ?? "none"}`);
      if (!claudeRes.ok) throw new Error(`Claude API error ${claudeRes.status}: ${claudeData?.error?.message}`);
    } catch (e) {
      console.error(`[${requestId}] FAIL Claude call:`, (e as Error).message);
      throw e;
    }

    // --- Step 5: Parse Claude response ---
    let prediction: any;
    try {
      let text = claudeData.content[0].text;
      console.log(`[${requestId}] Claude raw text (first 200 chars): ${text.slice(0, 200)}`);
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      prediction = JSON.parse(text);
      console.log(`[${requestId}] Claude JSON parsed OK — toss_decision: ${prediction.toss_decision}`);
    } catch (e) {
      console.error(`[${requestId}] FAIL JSON parse of Claude response:`, (e as Error).message);
      console.error(`[${requestId}] Raw Claude content:`, JSON.stringify(claudeData?.content));
      throw e;
    }

    // --- Step 6: Save to Supabase ---
    console.log(`[${requestId}] Saving report to Supabase`);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/reports`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ground_name: groundName,
          weather,
          prediction,
          overs,
          match_date: new Date().toISOString().split("T")[0],
        }),
      });
      console.log(`[${requestId}] Supabase save HTTP: ${dbRes.status}`);
      if (!dbRes.ok) {
        const detail = await dbRes.text();
        console.error(`[${requestId}] Supabase save failed:`, detail);
      }
    } catch (e) {
      // Non-fatal — still return the prediction even if save fails
      console.error(`[${requestId}] WARN Supabase save error (non-fatal):`, (e as Error).message);
    }

    console.log(`[${requestId}] Success — returning response`);
    return new Response(
      JSON.stringify({ prediction, weather }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err as Error;
    console.error(`[${requestId}] UNHANDLED ERROR:`, error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
