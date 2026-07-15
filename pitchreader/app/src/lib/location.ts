import * as Location from 'expo-location'
import { Platform } from 'react-native'

export type GroundLocation = {
  lat: number
  lng: number
  name: string
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== 'granted') {
      return { lat: 52.3555, lng: -1.1743 }
    }

    // Android: OS location cache is instant and accurate enough for weather.
    if (Platform.OS === 'android') {
      try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 86_400_000 })
        if (last) {
          return { lat: last.coords.latitude, lng: last.coords.longitude }
        }
      } catch {}
    }

    const location = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'android'
          ? Location.Accuracy.Balanced
          : Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location timed out after 15s')), 15000)
      ),
    ])
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    }
  } catch {
    return { lat: 52.3555, lng: -1.1743 }
  }
}

export async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { 'User-Agent': 'CricketTosser/1.0' } }
    )
    const json = await res.json()
    const a = json?.address ?? {}
    // display_name first segment is always the locality (e.g. "Hatfield"),
    // more reliable than individual address fields which return the borough on Android
    const town = (json?.display_name ?? '').split(', ')[0] || a.town || a.city || a.village
    const county = a.county ?? a.state_district ?? a.state
    const parts = [town, county].filter(Boolean)
    return parts.join(', ') || 'Unknown location'
  } catch {
    return 'Unknown location'
  }
}
