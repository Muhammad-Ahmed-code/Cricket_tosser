import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, Image,
  StyleSheet, Dimensions, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as MediaLibrary from 'expo-media-library'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { photoStore } from '../lib/photoStore'
import { compressImage } from '../lib/compressImage'

const SLOT_LABELS = ['End A', 'End B', 'Close-up 1', 'Close-up 2']
const SLOT_INSTRUCTIONS = [
  'Stand at one end, capture the full pitch length',
  'Stand at the other end, capture the full pitch length',
  'Crouch down and capture the surface texture up close',
  'Focus on the good length area — look for cracks or wear',
]

const { width } = Dimensions.get('window')
const THUMB = Math.floor((width - 6) / 3)

// Copies content:// URIs to app cache so <Image> can render them reliably
const androidUriCache: Record<string, string> = {}

async function getReadableUri(asset: MediaLibrary.Asset): Promise<string> {
  if (androidUriCache[asset.id]) return androidUriCache[asset.id]

  try {
    const cacheDir = FileSystem.cacheDirectory + 'photos/'
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true })

    const destPath = cacheDir + asset.id + '.jpg'
    const info = await FileSystem.getInfoAsync(destPath)
    if (info.exists) {
      androidUriCache[asset.id] = destPath
      return destPath
    }

    await FileSystem.copyAsync({ from: asset.uri, to: destPath })
    androidUriCache[asset.id] = destPath
    return destPath
  } catch (e) {
    console.log('[AndroidPhotoPicker] URI copy failed, using original:', e)
    return asset.uri
  }
}

// ---------------------------------------------------------------------------
// Thumbnail — loads readable URI asynchronously
// ---------------------------------------------------------------------------
type ThumbProps = {
  asset: MediaLibrary.Asset
  onPress: () => void
  isUsedOther: boolean
  isCurrentSlot: boolean
  isCompressing: boolean
  usedSlot: number
}

const AssetThumb = React.memo(({
  asset, onPress, isUsedOther, isCurrentSlot, isCompressing, usedSlot
}: ThumbProps) => {
  const [uri, setUri] = useState<string | null>(androidUriCache[asset.id] ?? null)

  useEffect(() => {
    let cancelled = false
    getReadableUri(asset).then(readableUri => {
      if (!cancelled) setUri(readableUri)
    })
    return () => { cancelled = true }
  }, [asset.id])

  if (!uri) {
    return (
      <View style={[styles.thumb, styles.thumbPlaceholder]}>
        <ActivityIndicator color="#333" size="small" />
      </View>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isUsedOther ? 1 : 0.8}
      style={styles.thumb}
    >
      <Image
        source={{ uri }}
        style={styles.thumbImage}
        resizeMode="cover"
        onError={() => {
          delete androidUriCache[asset.id]
          setUri(asset.uri)
        }}
      />

      {isUsedOther && (
        <View style={[StyleSheet.absoluteFillObject, styles.usedOverlay]}>
          <View style={styles.slotBadge}>
            <Text style={styles.slotBadgeText}>{SLOT_LABELS[usedSlot]}</Text>
          </View>
        </View>
      )}

      {isCurrentSlot && (
        <View style={[StyleSheet.absoluteFillObject, styles.currentBorder]}>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        </View>
      )}

      {isCompressing && (
        <View style={[StyleSheet.absoluteFillObject, styles.compressingOverlay]}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
    </TouchableOpacity>
  )
})

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
type Props = {
  slotIndex: number
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhotoPicker'>
}

export default function AndroidPhotoPicker({ slotIndex, navigation }: Props) {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([])
  const [hasNextPage, setHasNextPage] = useState(false)
  const [endCursor, setEndCursor] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const [compressingUri, setCompressingUri] = useState<string | null>(null)
  const [usedUris, setUsedUris] = useState<(string | null)[]>(photoStore.getUris())

  useEffect(() => {
    const unsub = photoStore.subscribe(() => setUsedUris([...photoStore.getUris()]))
    return unsub
  }, [])

  useEffect(() => {
    loadPhotos()
  }, [])

  async function loadPhotos(cursor?: string) {
    try {
      // Use ImagePicker permissions to avoid the AUDIO permission error
      // that MediaLibrary.requestPermissionsAsync() triggers on Android
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log('[AndroidPhotoPicker] ImagePicker permission:', status)

      if (status !== 'granted') {
        setPermissionDenied(true)
        setLoading(false)
        return
      }

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 30,
        after: cursor,
      })

      console.log('[AndroidPhotoPicker] Assets loaded:', result.assets.length)
      if (result.assets[0]) {
        console.log('[AndroidPhotoPicker] First URI:', result.assets[0].uri.substring(0, 50))
      }

      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
      setAssets(prev => cursor ? [...prev, ...result.assets] : result.assets)
    } catch (e) {
      // MediaLibrary permission not in manifest (pre-rebuild APK) — fall back silently
      console.log('[AndroidPhotoPicker] MediaLibrary unavailable, using fallback:', e)
      setUseFallback(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSelect(asset: MediaLibrary.Asset) {
    if (compressingUri) return

    const usedSlot = usedUris.indexOf(asset.uri)
    if (usedSlot !== -1 && usedSlot !== slotIndex) {
      Alert.alert('Already used', `This photo is already used for ${SLOT_LABELS[usedSlot]}. Please choose a different photo.`)
      return
    }

    setCompressingUri(asset.uri)
    try {
      const readableUri = await getReadableUri(asset)
      const compressed = await compressImage(readableUri)
      photoStore.setPhoto(slotIndex, compressed, asset.uri)
      navigation.navigate('Home')
    } catch (e) {
      console.error('[AndroidPhotoPicker] handleSelect error:', e)
      Alert.alert('Error', 'Could not load photo. Please try again.')
    } finally {
      setCompressingUri(null)
    }
  }

  async function takePhotoInstead() {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    })
    if (!result.canceled && result.assets[0]) {
      try {
        const compressed = await compressImage(result.assets[0].uri)
        photoStore.setPhoto(slotIndex, compressed, result.assets[0].uri)
        navigation.navigate('Home')
      } catch {
        Alert.alert('Error', 'Could not process photo.')
      }
    }
  }

  const nav = (
    <View style={styles.nav}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <Text style={styles.back}>←</Text>
      </TouchableOpacity>
      <View style={styles.navCenter}>
        <Text style={styles.navTitle}>Choose photo</Text>
        <Text style={styles.navSub}>{SLOT_LABELS[slotIndex]} — {SLOT_INSTRUCTIONS[slotIndex]}</Text>
      </View>
      <TouchableOpacity onPress={takePhotoInstead}>
        <Text style={styles.takePhotoBtn}>Take photo</Text>
      </TouchableOpacity>
    </View>
  )

  if (useFallback) {
    return (
      <SafeAreaView style={styles.container}>
        {nav}
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🖼️</Text>
          <Text style={styles.loadingText}>Tap below to choose a photo</Text>
          <TouchableOpacity
            style={[styles.goBackBtn, { marginTop: 20 }]}
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 0.7,
              })
              if (!result.canceled && result.assets[0]) {
                try {
                  const compressed = await compressImage(result.assets[0].uri)
                  photoStore.setPhoto(slotIndex, compressed, result.assets[0].uri)
                  navigation.navigate('Home')
                } catch {
                  Alert.alert('Error', 'Could not process photo.')
                }
              }
            }}
          >
            <Text style={styles.goBackText}>Choose from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.goBackBtn, { marginTop: 12, backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#2d5a27' }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.goBackText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (permissionDenied) {
    return (
      <SafeAreaView style={styles.container}>
        {nav}
        <View style={styles.center}>
          <Text style={styles.permText}>
            Photo library permission needed.{'\n'}Please enable it in Settings.
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.goBackBtn}>
            <Text style={styles.goBackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {nav}
        <View style={styles.center}>
          <ActivityIndicator color="#7ec87e" size="large" />
          <Text style={styles.loadingText}>Loading photos…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {nav}

      <FlatList
        data={assets}
        keyExtractor={item => item.id}
        numColumns={3}
        style={{ flex: 1, backgroundColor: '#000' }}
        contentContainerStyle={{ gap: 2, paddingBottom: 20 }}
        columnWrapperStyle={{ gap: 2 }}
        removeClippedSubviews={false}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={5}
        renderItem={({ item }) => {
          const usedSlot = usedUris.indexOf(item.uri)
          return (
            <AssetThumb
              asset={item}
              onPress={() => handleSelect(item)}
              isUsedOther={usedSlot !== -1 && usedSlot !== slotIndex}
              isCurrentSlot={usedSlot === slotIndex}
              isCompressing={compressingUri === item.uri}
              usedSlot={usedSlot}
            />
          )
        }}
        ListFooterComponent={
          hasNextPage ? (
            <TouchableOpacity style={styles.loadMore} onPress={() => loadPhotos(endCursor)}>
              <Text style={styles.loadMoreText}>Load more photos</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a1a' },
  nav: {
    backgroundColor: '#1a3a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  navCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  navTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  navSub: { color: '#7ec87e', fontSize: 10, textAlign: 'center', marginTop: 2 },
  back: { color: '#fff', fontSize: 22, paddingRight: 8 },
  takePhotoBtn: { color: '#7ec87e', fontSize: 13, fontWeight: '500' },
  thumb: {
    width: THUMB,
    height: THUMB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: { backgroundColor: '#1a1a1a' },
  thumbImage: { width: THUMB, height: THUMB },
  usedOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 4,
  },
  slotBadge: {
    backgroundColor: '#2d5a27',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slotBadgeText: { color: '#fff', fontSize: 9, fontWeight: '500' },
  currentBorder: { borderWidth: 2, borderColor: '#87CEEB' },
  currentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#87CEEB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentBadgeText: { color: '#042C53', fontSize: 9, fontWeight: '500' },
  compressingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#7ec87e', marginTop: 16, fontSize: 14 },
  permText: { color: '#f5f0e8', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  goBackBtn: { backgroundColor: '#2d5a27', borderRadius: 10, padding: 14, paddingHorizontal: 32 },
  goBackText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  loadMore: { padding: 16, alignItems: 'center', backgroundColor: '#111' },
  loadMoreText: { color: '#7ec87e', fontSize: 13 },
})
