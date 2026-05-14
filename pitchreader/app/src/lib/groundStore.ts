type GroundState = { name: string; lat: number; lng: number; mode: 'gps' | 'search' }

let state: GroundState = { name: '', lat: 0, lng: 0, mode: 'gps' }
let listeners: (() => void)[] = []

export const groundStore = {
  getGround: (): GroundState => state,
  setGround: (name: string, lat: number, lng: number) => {
    state = { name, lat, lng, mode: 'search' }
    listeners.forEach(l => l())
  },
  resetToGPS: () => {
    state = { name: '', lat: 0, lng: 0, mode: 'gps' }
    listeners.forEach(l => l())
  },
  subscribe: (listener: () => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  },
}
