import { createContext } from 'react'

interface OfflineContextValue {
  isOffline: boolean
  setIsOffline: (offline: boolean) => void
}

export const OfflineContext = createContext<OfflineContextValue>({
  isOffline: false,
  setIsOffline: () => {},
})
