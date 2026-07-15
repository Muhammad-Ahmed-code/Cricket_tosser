import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { createClient } from '@supabase/supabase-js'
import { track } from './analytics'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_ANON_KEY!

// Plain anon client — no auth required, used before Clerk initialises
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type UpdateCheckResult = {
  required: boolean
  available: boolean
  message: string
  storeUrl: string
  minVersion?: string
}

function compareVersions(current: string, minimum: string): number {
  const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0)
  const [cMaj, cMin, cPat] = parse(current)
  const [mMaj, mMin, mPat] = parse(minimum)
  if (cMaj !== mMaj) return cMaj - mMaj
  if (cMin !== mMin) return cMin - mMin
  return cPat - mPat
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const fallback: UpdateCheckResult = { required: false, available: false, message: '', storeUrl: '' }
  try {
    const { data, error } = await anonClient
      .from('app_config')
      .select('key, value')
      .in('key', [
        'min_ios_version',
        'min_android_version',
        'force_update_message',
        'soft_update_message',
        'ios_store_url',
        'android_store_url',
      ])

    if (error || !data) return fallback

    const config: Record<string, string> = {}
    for (const row of data) config[row.key] = row.value

    const currentVersion =
      Constants.expoConfig?.version ??
      (Constants.manifest as { version?: string } | null)?.version ??
      '1.0.0'

    const isIos = Platform.OS === 'ios'
    const minVersion = isIos ? config['min_ios_version'] : config['min_android_version']
    const storeUrl = isIos
      ? (config['ios_store_url'] ?? '')
      : (config['android_store_url'] ?? '')

    if (!minVersion) return fallback

    const diff = compareVersions(currentVersion, minVersion)

    if (diff < 0) {
      track('force_update_shown', {
        current_version: currentVersion,
        min_version: minVersion,
        platform: Platform.OS,
      })
      return {
        required: true,
        available: false,
        message: config['force_update_message'] ?? '',
        storeUrl,
        minVersion,
      }
    }

    return {
      required: false,
      available: false,
      message: config['soft_update_message'] ?? '',
      storeUrl,
    }
  } catch {
    return fallback
  }
}
