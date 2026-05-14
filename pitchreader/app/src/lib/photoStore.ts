let photos: (string | null)[] = [null, null, null, null]
let photoUris: (string | null)[] = [null, null, null, null]
let listeners: (() => void)[] = []

export const photoStore = {
  getPhotos: () => photos,
  getUris: () => photoUris,

  setPhoto: (index: number, base64: string, uri: string) => {
    photos = [...photos]
    photos[index] = base64
    photoUris = [...photoUris]
    photoUris[index] = uri
    listeners.forEach(l => l())
  },

  clearPhotos: () => {
    photos = [null, null, null, null]
    photoUris = [null, null, null, null]
    listeners.forEach(l => l())
  },

  subscribe: (listener: () => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  },
}
