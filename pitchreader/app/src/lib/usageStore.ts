import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  reportCount: '@pitchreader/report_count',
  isSubscribed: '@pitchreader/is_subscribed',
}

let reportCount = 0
let isSubscribed = false
let listeners: (() => void)[] = []

const notify = () => listeners.forEach(l => l())

export const usageStore = {
  getReportCount: () => reportCount,

  incrementReportCount: async () => {
    reportCount = reportCount + 1
    await AsyncStorage.setItem(KEYS.reportCount, String(reportCount))
    notify()
  },

  getIsSubscribed: () => isSubscribed,

  setIsSubscribed: async (value: boolean) => {
    isSubscribed = value
    await AsyncStorage.setItem(KEYS.isSubscribed, value ? '1' : '0')
    notify()
  },

  subscribe: (listener: () => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  },

  init: async () => {
    const [countStr, subStr] = await Promise.all([
      AsyncStorage.getItem(KEYS.reportCount),
      AsyncStorage.getItem(KEYS.isSubscribed),
    ])
    reportCount = countStr != null ? parseInt(countStr, 10) : 0
    isSubscribed = subStr === '1'
    notify()
  },
}
