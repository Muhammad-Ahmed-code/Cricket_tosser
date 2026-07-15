function mapWeatherCode(code: number): string {
  if (code <= 1) return 'sunny'
  if (code <= 3) return 'cloudy'
  if (code >= 51 && code <= 67) return 'light rain likely'
  if (code >= 71 && code <= 82) return 'heavy rain likely'
  if (code >= 95 && code <= 99) return 'thunderstorms likely'
  return 'mixed conditions'
}

export type WeatherData = {
  temp_celsius: number
  humidity_percent: number
  wind_kph: number
  rain_last_48h_mm: number
  rain_last_7days_mm: number
  forecast_afternoon_temp: number
  drying_out: boolean
  conditions: string
  rain_probability_percent: number
  expected_rainfall_mm: number
  forecast_conditions: string
  match_likely_affected: boolean
}

export async function fetchAndComputeWeather(lat: number, lng: number): Promise<WeatherData> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation,relativehumidity_2m,windspeed_10m,precipitation_probability,weathercode&past_days=7&forecast_days=2&timezone=auto`
  )
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const d = await res.json()

  const utcOffsetHours = (d.utc_offset_seconds ?? 0) / 3600
  const currentLocalHour = Math.floor((new Date().getUTCHours() + utcOffsetHours + 24) % 24)
  const currentIndex = 168 + currentLocalHour

  const temp     = d.hourly.temperature_2m[currentIndex]
  const humidity = d.hourly.relativehumidity_2m[currentIndex]
  const wind     = d.hourly.windspeed_10m[currentIndex]

  const rain_last_48h_mm = Math.round(
    d.hourly.precipitation.slice(144, 192).reduce((a: number, b: number) => a + b, 0) * 10
  ) / 10
  const rain_last_7days_mm = Math.round(
    d.hourly.precipitation.slice(0, 168).reduce((a: number, b: number) => a + b, 0) * 10
  ) / 10

  const afternoonIndex = currentIndex + 6
  const forecast_afternoon_temp = Math.round(
    (d.hourly.temperature_2m[afternoonIndex] ?? temp) * 10
  ) / 10

  const drying_out = forecast_afternoon_temp - temp >= 3
  const conditions = rain_last_48h_mm < 2 ? 'dry' : rain_last_48h_mm < 10 ? 'damp' : 'wet'

  const matchHourPrecipProb: number[] = (d.hourly.precipitation_probability ?? []).slice(178, 188)
  const matchHourPrecip: number[]     = (d.hourly.precipitation ?? []).slice(178, 188)
  const matchHourCodes: number[]      = (d.hourly.weathercode ?? []).slice(178, 188)

  const rain_probability_percent = matchHourPrecipProb.length > 0 ? Math.max(...matchHourPrecipProb) : 0
  const expected_rainfall_mm = Math.round(
    matchHourPrecip.reduce((a: number, b: number) => a + b, 0) * 10
  ) / 10

  const codeCounts: Record<number, number> = {}
  for (const code of matchHourCodes) codeCounts[code] = (codeCounts[code] ?? 0) + 1
  const sortedCodes = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])
  const dominantCode = sortedCodes.length > 0 ? Number(sortedCodes[0][0]) : 0

  return {
    temp_celsius:             Math.round(temp * 10) / 10,
    humidity_percent:         humidity,
    wind_kph:                 wind,
    rain_last_48h_mm,
    rain_last_7days_mm,
    forecast_afternoon_temp,
    drying_out,
    conditions,
    rain_probability_percent,
    expected_rainfall_mm,
    forecast_conditions:      mapWeatherCode(dominantCode),
    match_likely_affected:    rain_probability_percent > 40,
  }
}
