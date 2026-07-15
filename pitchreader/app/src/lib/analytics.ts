import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { Mixpanel } from 'mixpanel-react-native'

let mp: Mixpanel | null = null

export async function initMixpanel() {
  if (mp) return
  try {
    const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN
    if (!token) {
      console.warn('Mixpanel token is missing — analytics disabled')
      return
    }
    mp = new Mixpanel(token, false)
    await mp.init()
    mp.registerSuperProperties({
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0',
    })
  } catch (e) {
    console.warn('Mixpanel init failed:', e)
    mp = null
  }
}

export function identifyUser(userId: string) {
  if (!mp) return
  mp.identify(userId)
}

export function resetUser() {
  if (!mp) return
  mp.reset()
}

function clean(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v
  }
  return out
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!mp) return
  mp.track(event, properties ? clean(properties) : undefined)
}

export function registerSuperProperties(properties: Record<string, unknown>) {
  if (!mp) return
  mp.registerSuperProperties(clean(properties))
}

export function optOutTracking() {
  if (!mp) return
  mp.optOutTracking()
  mp = null
}

export async function optInTracking() {
  if (!mp) await initMixpanel()
  mp?.optInTracking()
}
