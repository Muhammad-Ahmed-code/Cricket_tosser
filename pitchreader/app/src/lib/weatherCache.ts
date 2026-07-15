import { fetchAndComputeWeather, type WeatherData } from './weatherService'

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

type Entry = { lat: number; lng: number; weather: WeatherData; at: number }

let cached: Entry | null = null
let inFlightKey: string | null = null  // tracks which lat/lng is currently fetching

function coordKey(lat: number, lng: number): string {
  return `${lat},${lng}`
}

function isFresh(e: Entry, lat: number, lng: number): boolean {
  return e.lat === lat && e.lng === lng && Date.now() - e.at < CACHE_TTL_MS
}

export const weatherCache = {
  // Fire-and-forget: start fetching as soon as location is known.
  // A new location always supersedes an in-flight fetch for a different location.
  prefetch(lat: number, lng: number): void {
    if (cached && isFresh(cached, lat, lng)) return
    const key = coordKey(lat, lng)
    if (inFlightKey === key) return  // Already fetching for this exact location
    inFlightKey = key
    fetchAndComputeWeather(lat, lng)
      .then(weather => { cached = { lat, lng, weather, at: Date.now() } })
      .catch(() => {})
      .finally(() => { if (inFlightKey === key) inFlightKey = null })
  },

  // Returns cached weather synchronously if fresh, null otherwise.
  get(lat: number, lng: number): WeatherData | null {
    if (cached && isFresh(cached, lat, lng)) return cached.weather
    return null
  },
}
