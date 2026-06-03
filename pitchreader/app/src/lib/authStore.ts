let isAnonymous = false
let listeners: (() => void)[] = []

export const authStore = {
  getIsAnonymous: () => isAnonymous,

  setIsAnonymous: (value: boolean) => {
    isAnonymous = value
    listeners.forEach(l => l())
  },

  subscribe: (fn: () => void) => {
    listeners.push(fn)
    return () => {
      listeners = listeners.filter(l => l !== fn)
    }
  },
}
