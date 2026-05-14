export type Squad = {
  seamers: number
  fastAllRounders: number
  spinners: number
  spinAllRounders: number
  batters: number
}

let squad: Squad = { seamers: 0, fastAllRounders: 0, spinners: 0, spinAllRounders: 0, batters: 0 }
let listeners: (() => void)[] = []

export const squadStore = {
  getSquad: () => squad,
  setSquad: (s: Squad) => {
    squad = s
    listeners.forEach(l => l())
  },
  hasSquad: () => {
    const s = squad
    return s.seamers + s.fastAllRounders + s.spinners + s.spinAllRounders + s.batters >= 10
  },
  clear: () => {
    squad = { seamers: 0, fastAllRounders: 0, spinners: 0, spinAllRounders: 0, batters: 0 }
    listeners.forEach(l => l())
  },
  subscribe: (listener: () => void) => {
    listeners.push(listener)
    return () => { listeners = listeners.filter(l => l !== listener) }
  },
}
