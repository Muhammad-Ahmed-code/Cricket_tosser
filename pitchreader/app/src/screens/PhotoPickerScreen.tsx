import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, Image,
  StyleSheet, Dimensions, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as MediaLibrary from 'expo-media-library'
import * as ImagePicker from 'expo-image-picker'

import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { photoStore } from '../lib/photoStore'
import { compressImage } from '../lib/compressImage'

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoPicker'>

const SLOT_LABELS = ['End A', 'End B', 'Close-up 1', 'Close-up 2']
const SLOT_INSTRUCTIONS = [
  'Stand at one end, capture the full pitch length',
  'Stand at the other end, capture the full pitch length',
  'Crouch down and capture the surface texture up close',
  'Focus on the good length area — look for cracks or wear',
]

const { width } = Dimensions.get('window')
const THUMB = Math.floor((width - 4) / 3)

// iOS-only cache: ph:// → file:// conversions (used during selection)
const localUriCache: Record<string, string> = {}

// Separate cache for thumbnail display URIs (getAssetInfoAsync results)
const thumbUriCache: Record<string, string> = {}

interface AssetThumbnailProps {
  asset: MediaLibrary.Asset
  size: number
}

function AssetThumbnail({ asset, size }: AssetThumbnailProps) {
  const [localUri, setLocalUri] = useState<string | null>(
    thumbUriCache[asset.id] ?? null
  )

  useEffect(() => {
    if (localUri) return
    let cancelled = false
    MediaLibrary.getAssetInfoAsync(asset)
      .then(info => {
        if (cancelled) return
        const uri = info.localUri ?? null
        if (uri) {
          thumbUriCache[asset.id] = uri
          setLocalUri(uri)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [asset.id])

  if (!localUri) {
    return <View style={{ width: size, height: size, backgroundColor: '#333' }} />
  }

  return (
    <Image
      source={{ uri: localUri }}
      style={{ width: size, height: size }}
      resizeMode="cover"
    />
  )
}

// ---------------------------------------------------------------------------
// iOS photo grid
// ---------------------------------------------------------------------------
function IOSPhotoPicker({ navigation, route }: Props) {
  const { slotIndex } = route.params
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([])
  const [hasNextPage, setHasNextPage] = useState(false)
  const [endCursor, setEndCursor] = useState<string | undefined>()
  const [permissionDenied, setPermissionDenied] = useState(false)
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
    const { status } = await MediaLibrary.requestPermissionsAsync()
    console.log('[PhotoPicker] Platform:', Platform.OS)
    console.log('[PhotoPicker] Permission status:', status)

    if (status !== 'granted') {
      setPermissionDenied(true)
      return
    }

    const result = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: MediaLibrary.SortBy.creationTime,
      first: 60,
      after: cursor,
    })

    console.log('[PhotoPicker] Assets loaded:', result.assets.length)
    if (result.assets[0]) {
      console.log('[PhotoPicker] First asset:', JSON.stringify(result.assets[0]))
    }

    setHasNextPage(result.hasNextPage)
    setEndCursor(result.endCursor)
    setAssets(prev => cursor ? [...prev, ...result.assets] : result.assets)
  }

  async function handleSelect(asset: MediaLibrary.Asset) {
    if (compressingUri) return

    const usedSlot = usedUris.indexOf(asset.uri)
    if (usedSlot !== -1 && usedSlot !== slotIndex) {
      Alert.alert('Already used', `This photo is already used for ${SLOT_LABELS[usedSlot]}`)
      return
    }

    setCompressingUri(asset.uri)
    try {
      // Copy the ph:// asset into the app's own cache via EXFileSystemAssetLibraryHandler,
      // which uses PHImageManager directly (no RCT bridge image-editing path).
      // A file:// URI inside our own cache is safe for expo-image-manipulator regardless
      // of which compiled native version is in the installed dev client.
      let fileUri: string
      if (localUriCache[asset.id]) {
        fileUri = localUriCache[asset.id]
      } else {
        let sourceUri: string | null = thumbUriCache[asset.id] ?? null
        if (!sourceUri) {
          const info = await MediaLibrary.getAssetInfoAsync(asset)
          sourceUri = info.localUri ?? null
          if (sourceUri) thumbUriCache[asset.id] = sourceUri
        }
        if (!sourceUri) throw new Error(`Could not resolve local URI for asset ${asset.id}`)
        fileUri = sourceUri
        localUriCache[asset.id] = fileUri
      }

      console.log('[PhotoPicker] Compressing URI:', fileUri.substring(0, 60))
      const compressed = await compressImage(fileUri)
      photoStore.setPhoto(slotIndex, compressed, asset.uri)
      navigation.navigate('Home')
    } catch (e) {
      console.error('[PhotoPicker] Compress error:', e)
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

  if (permissionDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Choose photo</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.denied}>
          <Text style={styles.deniedText}>Photo library permission needed</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Choose photo</Text>
          <Text style={styles.navSub}>{SLOT_LABELS[slotIndex]} — {SLOT_INSTRUCTIONS[slotIndex]}</Text>
        </View>
        <TouchableOpacity onPress={takePhotoInstead}>
          <Text style={styles.takePhoto}>Take photo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={assets}
        keyExtractor={item => item.id}
        numColumns={3}
        style={{ flex: 1, backgroundColor: '#000' }}
        contentContainerStyle={{ gap: 2 }}
        columnWrapperStyle={{ gap: 2 }}
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        windowSize={10}
        removeClippedSubviews={false}
        renderItem={({ item }) => {
          console.log('[PhotoPicker] Asset URI:', item.uri.substring(0, 30))
          const usedSlot = usedUris.indexOf(item.uri)
          const isUsedOther = usedSlot !== -1 && usedSlot !== slotIndex
          const isCurrentSlot = usedSlot === slotIndex
          const isCompressing = compressingUri === item.uri

          return (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              activeOpacity={isUsedOther ? 1 : 0.8}
              style={{ width: THUMB, height: THUMB }}
            >
              <AssetThumbnail asset={item} size={THUMB} />
              {isUsedOther && (
                <View style={[StyleSheet.absoluteFillObject, styles.usedOverlay]}>
                  <View style={styles.slotBadge}>
                    <Text style={styles.slotBadgeText}>{SLOT_LABELS[usedSlot]}</Text>
                  </View>
                </View>
              )}
              {isCurrentSlot && (
                <View style={[StyleSheet.absoluteFillObject, styles.currentOverlay]}>
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                </View>
              )}
              {isCompressing && (
                <View style={[StyleSheet.absoluteFillObject, styles.compressingOverlay]}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )
        }}
        ListFooterComponent={
          hasNextPage ? (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={() => loadPhotos(endCursor)}
            >
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export default function PhotoPickerScreen({ navigation, route }: Props) {
  return <IOSPhotoPicker navigation={navigation} route={route} />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#104020' },
  nav: {
    backgroundColor: '#104020',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  navCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  navTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  navSub: { color: 'rgba(247,242,232,0.70)', fontSize: 10, textAlign: 'center', marginTop: 2 },
  back: { color: '#fff', fontSize: 22 },
  takePhoto: { color: 'rgba(247,242,232,0.70)', fontSize: 13, fontWeight: '500' },
  usedOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 4,
  },
  slotBadge: {
    backgroundColor: '#507020',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slotBadgeText: { color: '#fff', fontSize: 9, fontWeight: '500' },
  currentOverlay: {
    borderWidth: 2,
    borderColor: '#D8D4C5',
  },
  currentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#D8D4C5',
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
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  deniedText: { color: '#FFFDF7', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  backBtn: {
    backgroundColor: '#507020',
    borderRadius: 10,
    padding: 14,
    paddingHorizontal: 32,
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  loadMore: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#111',
  },
  loadMoreText: { color: 'rgba(247,242,232,0.70)', fontSize: 13 },
})
