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
}
