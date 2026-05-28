import * as Location from 'expo-location'

export type GroundLocation = {
  lat: number
  lng: number
  name: string
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    console.log('[location] permission status:', status)

    if (status !== 'granted') {
      console.log('[location] permission denied, falling back to England centre')
      return { lat: 52.3555, lng: -1.1743 }
    }

    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location timed out')), 15000)
      ),
    ])

    console.log('[location] coords:', location.coords.latitude, location.coords.longitude)
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    }
  } catch (err) {
    console.log('[location] error:', err)
    return { lat: 52.3555, lng: -1.1743 }
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
