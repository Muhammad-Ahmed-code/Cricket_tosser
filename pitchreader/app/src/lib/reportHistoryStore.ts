import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = '@pitchreader/report_history'
const MAX_REPORTS = 50

export interface LocalReportEntry {
  id: string
  ground_name: string
  overs: number
  match_date: string
  created_at: string
  prediction: Record<string, unknown>
  weather: Record<string, unknown>
  notification_id?: string | null
  match_notification_id?: string | null
  toss_completed?: boolean
  match_completed?: boolean
}

export const reportHistoryStore = {
  async getAll(): Promise<LocalReportEntry[]> {
    try {
      const json = await AsyncStorage.getItem(KEY)
      return json ? (JSON.parse(json) as LocalReportEntry[]) : []
    } catch {
      return []
    }
  },

  async save(entry: LocalReportEntry): Promise<void> {
    try {
      const existing = await reportHistoryStore.getAll()
      const deduped = existing.filter(r => r.id !== entry.id)
      await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...deduped].slice(0, MAX_REPORTS)))
    } catch {
      // non-fatal
    }
  },

  async updateNotificationId(reportId: string, notificationId: string | null): Promise<void> {
    try {
      const existing = await reportHistoryStore.getAll()
      const updated = existing.map(r =>
        r.id === reportId ? { ...r, notification_id: notificationId } : r
      )
      await AsyncStorage.setItem(KEY, JSON.stringify(updated))
    } catch {
      // non-fatal
    }
  },

  async updateMatchNotificationId(reportId: string, notificationId: string | null): Promise<void> {
    try {
      const existing = await reportHistoryStore.getAll()
      const updated = existing.map(r =>
        r.id === reportId ? { ...r, match_notification_id: notificationId } : r
      )
      await AsyncStorage.setItem(KEY, JSON.stringify(updated))
    } catch {
      // non-fatal
    }
  },

  async markTossCompleted(reportId: string): Promise<void> {
    try {
      const existing = await reportHistoryStore.getAll()
      const updated = existing.map(r =>
        r.id === reportId ? { ...r, toss_completed: true, notification_id: null } : r
      )
      await AsyncStorage.setItem(KEY, JSON.stringify(updated))
    } catch {
      // non-fatal
    }
  },

  async markMatchCompleted(reportId: string): Promise<void> {
    try {
      const existing = await reportHistoryStore.getAll()
      const updated = existing.map(r =>
        r.id === reportId ? { ...r, match_completed: true } : r
      )
      await AsyncStorage.setItem(KEY, JSON.stringify(updated))
    } catch {
      // non-fatal
    }
  },
}
