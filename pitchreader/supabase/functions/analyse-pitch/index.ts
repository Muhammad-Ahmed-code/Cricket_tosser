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

function mapWeatherCode(code: number): string {
  if (code <= 1) return "sunny";
  if (code <= 3) return "cloudy";
  if (code >= 51 && code <= 67) return "light rain likely";
  if (code >= 71 && code <= 82) return "heavy rain likely";
  if (code >= 95 && code <= 99) return "thunderstorms likely";
  return "mixed conditions";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Request received: ${req.method} ${req.url}`);

  try {
    // --- Step 1: Parse request body ---
    let body: { imageBase64Array: string[]; lat: number; lng: number; groundName: string; overs: number; squad?: Squad | null; userId?: string | null; weather?: Record<string, any> | null; reportId?: string | null };
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[${requestId}] FAIL body parse:`, (e as Error).message);
      return new Response(JSON.stringify({ error: "Invalid JSON body", detail: (e as Error).message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64Array, lat, lng, groundName, overs, squad, userId, weather: clientWeather, reportId: clientReportId } = body;
    console.log(`[${requestId}] Body parsed — images: ${imageBase64Array?.length}, ground: ${groundName}, overs: ${overs}, lat: ${lat}, lng: ${lng}, has_user: ${!!userId}, clientWeather: ${clientWeather ? 'provided' : 'none'}, clientReportId: ${clientReportId ?? 'none'}`);

    if (!imageBase64Array?.length) {
      console.error(`[${requestId}] FAIL no images provided`);
      return new Response(JSON.stringify({ error: "imageBase64Array is required and must not be empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (imageBase64Array.length > 4) {
      console.error(`[${requestId}] FAIL too many images: ${imageBase64Array.length}`);
      return new Response(JSON.stringify({ error: "Maximum 4 images allowed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB base64 ≈ 3.75 MB binary
    for (let i = 0; i < imageBase64Array.length; i++) {
      if (typeof imageBase64Array[i] !== 'string' || imageBase64Array[i].length > MAX_IMAGE_BYTES) {
        console.error(`[${requestId}] FAIL image ${i + 1} too large or invalid`);
        return new Response(JSON.stringify({ error: `Image ${i + 1} exceeds the 5 MB size limit` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Step 2: Use client-provided weather or fetch from Open-Meteo ---
    let weather: any;

    if (clientWeather && typeof clientWeather === 'object' && 'temp_celsius' in clientWeather) {
      // Client pre-fetched weather — skip Open-Meteo call entirely
      weather = clientWeather;
      console.log(`[${requestId}] Weather provided by client — skipping Open-Meteo fetch`);
      console.log(`[${requestId}] Weather:`, JSON.stringify(weather));
    } else {
      // Fallback: fetch weather inside the function (keeps existing behaviour)
      console.log(`[${requestId}] Fetching weather for lat=${lat} lng=${lng}`);
      let weatherData: any;
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation,relativehumidity_2m,windspeed_10m,precipitation_probability,weathercode&past_days=7&forecast_days=2&timezone=auto`
        );
        if (!weatherRes.ok) throw new Error(`Open-Meteo HTTP ${weatherRes.status}`);
        weatherData = await weatherRes.json();
        console.log(`[${requestId}] Weather OK — hourly data points: ${weatherData?.hourly?.temperature_2m?.length}`);
        console.log('Open-Meteo raw hourly length:', weatherData.hourly?.time?.length);
        console.log('utc_offset_seconds:', weatherData.utc_offset_seconds);
      } catch (e) {
        console.error(`[${requestId}] FAIL weather fetch:`, (e as Error).message);
        throw e;
      }

      const utcOffsetSeconds: number = weatherData.utc_offset_seconds ?? 0;
      const utcOffsetHours = utcOffsetSeconds / 3600;
      const currentLocalHour = Math.floor((new Date().getUTCHours() + utcOffsetHours + 24) % 24);
      const currentIndex = 168 + currentLocalHour;

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

      const matchHourPrecipProb: number[] = (weatherData.hourly.precipitation_probability ?? []).slice(178, 188);
      const matchHourPrecip: number[] = (weatherData.hourly.precipitation ?? []).slice(178, 188);
      const matchHourCodes: number[] = (weatherData.hourly.weathercode ?? []).slice(178, 188);

      const rain_probability_percent = matchHourPrecipProb.length > 0
        ? Math.max(...matchHourPrecipProb)
        : 0;
      console.log('Match hour indices (10am–7pm local):', Array.from({ length: 10 }, (_, i) => 178 + i));
      console.log('Precipitation probabilities at those indices:', matchHourPrecipProb);
      console.log('Calculated rain_probability_percent:', rain_probability_percent);

      const expected_rainfall_mm = Math.round(
        matchHourPrecip.reduce((a: number, b: number) => a + b, 0) * 10
      ) / 10;

      const codeCounts: Record<number, number> = {};
      for (const code of matchHourCodes) {
        codeCounts[code] = (codeCounts[code] ?? 0) + 1;
      }
      const sortedCodeEntries = Object.entries(codeCounts).sort((a, b) => b[1] - a[1]);
      const dominantCode = sortedCodeEntries.length > 0 ? Number(sortedCodeEntries[0][0]) : 0;
      const forecast_conditions = mapWeatherCode(dominantCode);
      const match_likely_affected = rain_probability_percent > 40;

      weather = {
        temp_celsius: Math.round(temp * 10) / 10,
        humidity_percent: humidity,
        wind_kph: wind,
        rain_last_48h_mm,
        rain_last_7days_mm,
        forecast_afternoon_temp,
        drying_out,
        conditions,
        rain_probability_percent,
        expected_rainfall_mm,
        forecast_conditions,
        match_likely_affected,
      };
      console.log(`[${requestId}] Weather computed:`, JSON.stringify(weather));
    }

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

    // DLS context — only injected when rain probability is 25% or higher
    const dlsContext = weather.rain_probability_percent >= 25
      ? `
## Rain & DLS Considerations
Today's rain probability during match hours is ${weather.rain_probability_percent}%.
Empirical win rates for DLS-affected matches:
- T20 format: teams batting SECOND win approximately 62% of rain-affected matches
- ODI format: teams batting SECOND win approximately 56% of rain-affected matches
Why: rain most commonly interrupts the first innings, resulting in a softer DLS target. Chasing teams also benefit from knowing their exact target from ball one.
${weather.rain_probability_percent > 50
  ? `Rain probability is HIGH. Weight this DLS statistical advantage heavily — recommend bowling first (fielding) unless pitch conditions are overwhelmingly in favour of batting first.`
  : `Rain probability is moderate (25–50%). Mention DLS as a secondary consideration alongside pitch conditions — do not let it override strong pitch signals.`
}
`
      : ``;
    console.log('DLS context injected:', weather.rain_probability_percent >= 25);
    console.log('rain_probability_percent:', weather.rain_probability_percent);

    // Build rain_impact template values for the prompt
    const rainImpactTemplate = weather.rain_probability_percent < 25
      ? `null`
      : `{ "affects_toss": true, "probability": ${weather.rain_probability_percent}, "dls_advantage": "Chasing teams win ~${overs <= 20 ? '62%' : '56%'} of rain-affected ${overs <= 20 ? 'T20' : 'ODI'} matches", "recommendation": "one sentence — ${weather.rain_probability_percent > 50 ? 'strong recommendation to bowl first, DLS advantage is a primary factor' : 'mention DLS as secondary factor alongside pitch conditions, keep recommendation measured'}" }`;

    const teamRainImpactTemplate = weather.rain_probability_percent < 25
      ? `null`
      : `{ "affects_toss": true, "probability": ${weather.rain_probability_percent}, "dls_advantage": "Chasing teams win ~${overs <= 20 ? '62%' : '56%'} of rain-affected ${overs <= 20 ? 'T20' : 'ODI'} matches", "recommendation": "one sentence — factor both squad composition and DLS advantage, ${weather.rain_probability_percent > 50 ? 'DLS advantage is a primary factor alongside squad bowling strength' : 'mention DLS as secondary consideration alongside squad and pitch signals'}" }`;

    const squadSection = squad ? `
SQUAD COMPOSITION:
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

Total squad size: ${squad.seamers + squad.fastAllRounders + squad.spinners + squad.spinAllRounders + squad.batters}` : '';

    const teamJsonSection = squad ? `"team": {
    "toss_decision": "bat or bowl",
    "confidence": "high / medium / low",
    "confidence_pct": integer between 50 and 95 — percentage certainty of toss_decision (low: 50–65, medium: 66–74, high: 75–95, never outside this range),
    "reasoning": "squad-aware toss reasoning — reference specific numbers e.g. With ${squad.seamers + squad.fastAllRounders} pace options on a damp surface",
    "squad_analysis": {
      "summary": "overall assessment of this squad's fit for the pitch and conditions in 1-2 sentences",
      "toss_advantage": "specific reason why squad composition suits the recommended toss decision",
      "bowling_plan": "concrete bowling plan for this squad on this exact pitch — mention overs and conditions",
      "batting_plan": "concrete batting plan for this squad — mention approach and phases of innings",
      "key_matchup": "the single most important strategic matchup or edge this squad has",
      "role_tips": [
        "tip for seamers/pace bowlers — specific to this pitch",
        "tip for spinners — specific to this pitch",
        "tip for top order — specific to conditions"
      ]
    },
    "par_score": { "low": integer for ${overs} overs, "high": integer for ${overs} overs },
    "rain_impact": ${teamRainImpactTemplate}
  }` : `"team": null`;

    const squadAnalysisInstructions = squad ? `
## Squad Analysis Instructions
The captain's squad:
- Batters: ${squad.batters}
- Seamers: ${squad.seamers}
- Fast all-rounders: ${squad.fastAllRounders}
- Spinners: ${squad.spinners}
- Spin all-rounders: ${squad.spinAllRounders}

For the "team" analysis:
- Factor this squad composition into the toss decision
- Consider whether their bowling attack suits current pitch and weather conditions
- Consider whether their batting depth suits chasing or setting a target
- Give specific, actionable role tips for each player type present in the squad
- The team toss_decision CAN differ from the general one if squad composition strongly favours a different approach
- Be direct and specific — "Your ${squad.seamers + squad.fastAllRounders} pace options will exploit this damp surface" not vague generalities
- Only include role_tips relevant to player types actually in the squad` : '';

    const systemPrompt = `You are an expert cricket pitch reader with 20 years of UK club cricket experience.
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

Today's match forecast (10am–7pm local):
- Rain probability: ${weather.rain_probability_percent}%
- Expected rainfall: ${weather.expected_rainfall_mm}mm
- Conditions: ${weather.forecast_conditions}
- Match likely rain-affected: ${weather.match_likely_affected ? 'YES — factor DLS into toss decision' : 'No'}
${dlsContext}
${squadSection}

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
    "confidence_pct": integer between 50 and 95 — percentage certainty of toss_decision (low: 50–65, medium: 66–74, high: 75–95, never outside this range),
    "pitch_type": "describe what you ACTUALLY SEE in 3-4 words",
    "behaviour": "one sentence based primarily on visible surface",
    "par_score_min": integer for ${overs} overs,
    "par_score_max": integer for ${overs} overs,
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
    "rain_impact": ${rainImpactTemplate}
  },
  ${teamJsonSection}
}

The "general" analysis must be based on pitch and weather ONLY — treat it as if no squad information was provided.
${squadAnalysisInstructions}

RAIN IMPACT RULES (apply to BOTH general.rain_impact and team.rain_impact):
- If rain_probability_percent < 25: "rain_impact" must be null — do not mention DLS anywhere
- If rain_probability_percent is 25–50: set affects_toss: true, mention DLS as secondary factor, keep recommendation measured
- If rain_probability_percent > 50: set affects_toss: true, strong recommendation to bowl first, DLS advantage is a primary factor`;

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
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: systemPrompt,
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
    let general: any;
    let team: any = null;
    try {
      let text = claudeData.content[0].text;
      console.log(`[${requestId}] Claude raw text (first 200 chars): ${text.slice(0, 200)}`);
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(text);
      // New dual format: { general, team }
      if (parsed.general) {
        general = parsed.general;
        team = parsed.team ?? null;
      } else {
        // Backwards-compat: old flat format
        general = parsed;
        team = null;
      }
      console.log(`[${requestId}] Claude JSON parsed OK — general.toss_decision: ${general?.toss_decision}, team: ${team ? 'present' : 'null'}`);
      console.log('general rain_impact:', JSON.stringify(general?.rain_impact));
    } catch (e) {
      console.error(`[${requestId}] FAIL JSON parse of Claude response:`, (e as Error).message);
      console.error(`[${requestId}] Raw Claude content:`, JSON.stringify(claudeData?.content));
      throw e;
    }

    // --- Step 6: Save to Supabase (fire-and-forget — do not await) ---
    // reportId comes from the client so we can return immediately without waiting for the DB write.
    const reportId = clientReportId ?? crypto.randomUUID();
    console.log(`[${requestId}] Saving report to Supabase (fire-and-forget), reportId: ${reportId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const savePayload = {
      id: reportId,
      ground_name: groundName,
      weather,
      prediction: general,
      team_prediction: team,
      overs,
      user_id: userId ?? null,
      match_date: new Date().toISOString().split("T")[0],
    };

    // Fire-and-forget: save runs in background after response is returned
    fetch(`${supabaseUrl}/rest/v1/reports`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(savePayload),
    }).then(async dbRes => {
      if (!dbRes.ok) {
        // Retry without team_prediction if that column doesn't exist yet
        const detail = await dbRes.text();
        console.warn(`[${requestId}] Supabase save failed (${dbRes.status}): ${detail.slice(0, 200)} — retrying without team_prediction`);
        const { team_prediction, ...payloadWithoutTeam } = savePayload;
        return fetch(`${supabaseUrl}/rest/v1/reports`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(payloadWithoutTeam),
        }).then(r => console.log(`[${requestId}] Supabase retry HTTP: ${r.status}`));
      }
      console.log(`[${requestId}] Supabase save HTTP: ${dbRes.status}`);
    }).catch(e => console.error(`[${requestId}] WARN Supabase save error (non-fatal):`, e.message));

    console.log(`[${requestId}] Success — returning response immediately`);
    return new Response(
      JSON.stringify({ general, team, weather, reportId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err as Error;
    console.error(`[${requestId}] UNHANDLED ERROR:`, error.message, error.stack);
    return new Response(
      JSON.stringify({ error: "Analysis failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
