import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { reportHistoryStore } from './reportHistoryStore'

const SUPPRESSED_KEY = '@pitchreader/toss_reminder_suppressed_until'
const MATCH_SUPPRESSED_KEY = '@pitchreader/match_reminder_suppressed_until'
const REMINDER_SECONDS = 90 * 60
const MATCH_REMINDER_SECONDS = 8 * 60 * 60
const MAX_REPORT_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Expo Go SDK 53+ removed remote push infrastructure from Android, which triggers a
// startup warning even when only local scheduling is used. Skip all notification API
// calls in Expo Go to avoid this noise — use a development build for full fidelity.
const isExpoGo = Constants.appOwnership === 'expo'

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo) return false
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch {
    return false
  }
}

export async function scheduleReminderNotification(
  reportId: string,
  groundName: string,
): Promise<void> {
  try {
    const granted = await requestNotificationPermissions()
    if (!granted) return

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'How did the toss go? 🏏',
        body: `You analysed a pitch at ${groundName} — tap to log your toss result`,
        data: { reportId, type: 'toss_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: REMINDER_SECONDS,
        repeats: false,
      },
    })

    await reportHistoryStore.updateNotificationId(reportId, identifier)
  } catch {
    // non-fatal — notifications are best-effort
  }
}

export async function cancelReminderNotification(reportId: string): Promise<void> {
  try {
    const entries = await reportHistoryStore.getAll()
    const entry = entries.find(e => e.id === reportId)
    if (entry?.notification_id) {
      await Notifications.cancelScheduledNotificationAsync(entry.notification_id)
    }
  } catch {
    // non-fatal
  }
}

export interface InAppReminderData {
  show: true
  reportId: string
  groundName: string
  prediction: Record<string, unknown>
  weather: Record<string, unknown>
  overs: number
}

export async function checkShouldShowInAppReminder(): Promise<
  InAppReminderData | { show: false }
> {
  try {
    const suppressedUntil = await AsyncStorage.getItem(SUPPRESSED_KEY)
    if (suppressedUntil && Date.now() < parseInt(suppressedUntil, 10)) {
      return { show: false }
    }

    const entries = await reportHistoryStore.getAll()
    const ninetyMinsAgoMs = Date.now() - REMINDER_SECONDS * 1000
    const oldestAllowedMs = Date.now() - MAX_REPORT_AGE_MS

    const candidate = entries
      .filter(e => {
        const createdMs = new Date(e.created_at).getTime()
        return (
          createdMs <= ninetyMinsAgoMs &&
          createdMs >= oldestAllowedMs &&
          !e.toss_completed
        )
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!candidate) return { show: false }

    return {
      show: true,
      reportId: candidate.id,
      groundName: candidate.ground_name,
      prediction: candidate.prediction,
      weather: candidate.weather,
      overs: candidate.overs,
    }
  } catch {
    return { show: false }
  }
}

export async function suppressInAppReminderFor24h(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      SUPPRESSED_KEY,
      String(Date.now() + 24 * 60 * 60 * 1000),
    )
  } catch {
    // non-fatal
  }
}

export async function scheduleMatchReminderNotification(
  reportId: string,
  groundName: string,
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions()
    if (!granted) return null

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'How did the match go? 🏏',
        body: `You logged your toss at ${groundName} — tap to add your match result`,
        data: { reportId, type: 'match_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: MATCH_REMINDER_SECONDS,
        repeats: false,
      },
    })

    return identifier
  } catch {
    return null
  }
}

export async function cancelMatchReminderNotification(reportId: string): Promise<void> {
  try {
    const entries = await reportHistoryStore.getAll()
    const entry = entries.find(e => e.id === reportId)
    if (entry?.match_notification_id) {
      await Notifications.cancelScheduledNotificationAsync(entry.match_notification_id)
    }
  } catch {
    // non-fatal
  }
}

export interface InAppMatchReminderData {
  show: true
  reportId: string
  groundName: string
  prediction: Record<string, unknown>
  weather: Record<string, unknown>
  overs: number
}

export async function checkShouldShowMatchReminder(): Promise<
  InAppMatchReminderData | { show: false }
> {
  try {
    const suppressedUntil = await AsyncStorage.getItem(MATCH_SUPPRESSED_KEY)
    if (suppressedUntil && Date.now() < parseInt(suppressedUntil, 10)) {
      return { show: false }
    }

    const entries = await reportHistoryStore.getAll()
    const eightHoursAgoMs = Date.now() - MATCH_REMINDER_SECONDS * 1000

    const candidate = entries
      .filter(e => {
        const createdMs = new Date(e.created_at).getTime()
        return (
          createdMs <= eightHoursAgoMs &&
          e.toss_completed === true &&
          !e.match_completed
        )
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!candidate) return { show: false }

    return {
      show: true,
      reportId: candidate.id,
      groundName: candidate.ground_name,
      prediction: candidate.prediction,
      weather: candidate.weather,
      overs: candidate.overs,
    }
  } catch {
    return { show: false }
  }
}

export async function suppressMatchReminderFor24h(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      MATCH_SUPPRESSED_KEY,
      String(Date.now() + 24 * 60 * 60 * 1000),
    )
  } catch {
    // non-fatal
  }
}
