import * as Location from 'expo-location'

export type GroundLocation = {
  lat: number
  lng: number
  name: string
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync()

  if (status !== 'granted') {
    // Fall back to centre of England if denied
    return { lat: 52.3555, lng: -1.1743 }
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  })

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  }
}

export async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
    if (results.length > 0) {
      const r = results[0]
      const parts = [r.city || r.district, r.region].filter(Boolean)
      return parts.join(', ') || 'Unknown location'
    }
  } catch {}
  return 'Unknown location'
}
