import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { theme } from '../theme'
import { photoStore } from '../lib/photoStore'
import { compressImage } from '../lib/compressImage'

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>

const SLOT_LABELS = [
  'End A — Full length view',
  'End B — Full length view',
  'Close-up — Surface texture',
  'Close-up — Good length area',
]

const SLOT_INSTRUCTIONS = [
  'Stand at one end, capture the full pitch length',
  'Stand at the other end, capture the full pitch length',
  'Crouch down and capture the surface texture up close',
  'Focus on the good length area — look for cracks or wear',
]

export default function CameraScreen({ route, navigation }: Props) {
  const { slotIndex } = route.params
  const label = SLOT_LABELS[slotIndex]
  const instruction = SLOT_INSTRUCTIONS[slotIndex]

  const [loading, setLoading] = useState<'camera' | 'gallery' | null>(null)

  useEffect(() => {
    ImagePicker.requestCameraPermissionsAsync()
    ImagePicker.requestMediaLibraryPermissionsAsync()
  }, [])

  const takePhoto = async () => {
    if (loading) return
    setLoading('camera')
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.3,
        allowsEditing: false,
      })
      if (result.canceled) return
      const uri = result.assets[0].uri
      try {
        const compressed = await compressImage(uri)
        if (compressed.length * 0.75 > 4_000_000) {
          Alert.alert('Photo too large', 'Please try again — move further back for a wider shot')
          return
        }
        photoStore.setPhoto(slotIndex, compressed, uri)
        navigation.navigate('Home')
      } catch {
        Alert.alert('Error', 'Could not process photo. Please try again.')
      }
    } finally {
      setLoading(null)
    }
  }

  const chooseFromGallery = async () => {
    if (Platform.OS === 'android') {
      if (loading) return
      setLoading('gallery')
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 1,
        })
        if (result.canceled) return
        const uri = result.assets[0].uri
        try {
          const compressed = await compressImage(uri)
          if (compressed.length * 0.75 > 4_000_000) {
            Alert.alert('Photo too large', 'Please try again — move further back for a wider shot')
            return
          }
          photoStore.setPhoto(slotIndex, compressed, uri)
          navigation.navigate('Home')
        } catch {
          Alert.alert('Error', 'Could not process photo. Please try again.')
        }
      } finally {
        setLoading(null)
      }
    } else {
      navigation.navigate('PhotoPicker', { slotIndex })
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Back arrow */}
      <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrowText}>←</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.instruction}>{instruction}</Text>
      </View>

      {/* Choice buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.choiceBtn, styles.cameraBtn]}
          onPress={takePhoto}
          activeOpacity={0.8}
          disabled={!!loading}
        >
          <Text style={styles.choiceIcon}>📷</Text>
          <Text style={styles.choiceTitleDark}>
            {loading === 'camera' ? 'Opening...' : 'Take photo'}
          </Text>
          <Text style={styles.choiceSubtitleDark}>Open camera now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceBtn, styles.galleryBtn]}
          onPress={chooseFromGallery}
          activeOpacity={0.8}
          disabled={!!loading}
        >
          <Text style={styles.choiceIcon}>🖼️</Text>
          <Text style={styles.choiceTitleBlue}>
            {loading === 'gallery' ? 'Opening...' : 'Choose from gallery'}
          </Text>
          <Text style={styles.choiceSubtitleBlue}>Pick an existing photo</Text>
        </TouchableOpacity>
      </View>

      {/* Tip */}
      <Text style={styles.tip}>
        For best results, photograph in good light with the full pitch visible
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.forest,
  },
  backArrow: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backArrowText: {
    color: theme.textInverse,
    fontSize: 24,
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  label: {
    color: theme.textInverse,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  instruction: {
    color: 'rgba(247,242,232,0.70)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  buttons: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  choiceBtn: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cameraBtn: {
    backgroundColor: theme.ball,
  },
  galleryBtn: {
    backgroundColor: theme.paper,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.line,
  },
  choiceIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  choiceTitleDark: {
    color: theme.textInverse,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  choiceSubtitleDark: {
    color: 'rgba(247,242,232,0.70)',
    fontSize: 12,
  },
  choiceTitleBlue: {
    color: theme.forest,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  choiceSubtitleBlue: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  tip: {
    color: 'rgba(247,242,232,0.50)',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
})
