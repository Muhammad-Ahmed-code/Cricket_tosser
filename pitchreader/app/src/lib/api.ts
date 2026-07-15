import type { WeatherData } from './weatherService'

export async function analysePitch(params: {
  imageBase64Array: string[]
  lat: number
  lng: number
  groundName: string
  overs: number
  squad?: { seamers: number; fastAllRounders: number; spinners: number; spinAllRounders: number; batters: number } | null
  userId?: string | null
  weather?: WeatherData | null
  reportId?: string
}) {
  const res = await fetch(process.env.EXPO_PUBLIC_FUNCTION_URL!, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
