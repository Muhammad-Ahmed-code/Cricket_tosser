import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { theme } from '../theme'
import { photoStore } from '../lib/photoStore'
import { getCurrentLocation, getLocationName } from '../lib/location'
import { groundStore } from '../lib/groundStore'
import { squadStore } from '../lib/squadStore'
import NavLogo from '../components/NavLogo'
import SquadInput from '../components/SquadInput'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const SLOT_LABELS = ['End A', 'End B', 'Close-up 1', 'Close-up 2']
const PRESET_FORMATS = [
  { label: '20 ov', value: '20' as const, overs: 20 },
  { label: '40 ov', value: '40' as const, overs: 40 },
  { label: '50 ov', value: '50' as const, overs: 50 },
]

export default function HomeScreen({ navigation }: Props) {
  const [photos, setPhotos] = useState<(string | null)[]>(photoStore.getPhotos())
  const [ground, setGround] = useState(groundStore.getGround())
  const [overs, setOvers] = useState(40)
  const [selectedFormat, setSelectedFormat] = useState<'20' | '40' | '50' | 'custom'>('40')
  const [customOversText, setCustomOversText] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState<string>('Fetching location...')
  const [locationLoading, setLocationLoading] = useState(true)

  const fetchLocation = useCallback(async () => {
    setLocationLoading(true)
    const loc = await getCurrentLocation()
    setLocation(loc)
    const name = await getLocationName(loc.lat, loc.lng)
    setLocationName(name)
    setLocationLoading(false)
  }, [])

  useEffect(() => {
    const unsubscribe = photoStore.subscribe(() => {
      setPhotos([...photoStore.getPhotos()])
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = groundStore.subscribe(() => {
      setGround({ ...groundStore.getGround() })
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  const takenCount = photos.filter(Boolean).length
  const allTaken = takenCount === 4

  const handleSlotPress = (index: number) => {
    navigation.navigate('Camera', { slotIndex: index })
  }

  const handleCustomOversChange = (text: string) => {
    setCustomOversText(text)
    const n = parseInt(text, 10)
    if (!isNaN(n) && n >= 5 && n <= 100) setOvers(n)
  }

  const customOversNum = parseInt(customOversText, 10)
  const customOversValid = !isNaN(customOversNum) && customOversNum >= 5 && customOversNum <= 100
  const canAnalyse = allTaken && (selectedFormat !== 'custom' || customOversValid)
  const customBtnLabel = selectedFormat === 'custom' && customOversValid ? `${customOversNum} ov` : 'Custom'

  const handleAnalyse = () => {
    const taken = photoStore.getPhotos().filter(Boolean) as string[]
    photoStore.clearPhotos()
    const g = groundStore.getGround()
    const usingSearch = g.mode === 'search'
    navigation.navigate('Analysing', {
      photos: taken,
      groundName: usingSearch ? g.name : locationName,
      overs,
      lat: usingSearch ? g.lat : (location?.lat ?? 52.3555),
      lng: usingSearch ? g.lng : (location?.lng ?? -1.1743),
      squad: squadStore.hasSquad() ? squadStore.getSquad() : null,
    })
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <NavLogo />
        <Text style={styles.historyIcon}>🕐</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Photo grid */}
        <Text style={styles.sectionLabel}>Photograph the pitch</Text>
        <View style={styles.grid}>
          {SLOT_LABELS.map((label, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.slot, photos[index] ? styles.slotTaken : styles.slotEmpty]}
              onPress={() => handleSlotPress(index)}
              activeOpacity={0.85}
            >
              {photos[index] ? (
                <>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${photos[index]}` }}
                    style={styles.slotImage}
                    resizeMode="cover"
                  />
                  <View style={styles.slotTag}>
                    <Text style={styles.slotTagText}>{label}</Text>
                  </View>
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkBadgeText}>✓</Text>
                  </View>
                  <Text style={styles.retakeText}>Retake</Text>
                </>
              ) : (
                <>
                  <View style={styles.slotTag}>
                    <Text style={styles.slotTagText}>{label}</Text>
                  </View>
                  <Text style={styles.slotIcon}>📷</Text>
                  <Text style={styles.slotStatusText}>Tap to photograph</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {Array.from({ length: 4 }).map((_, i) => {
            const taken = !!photos[i]
            const isCurrent = !taken && i === takenCount
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  taken ? styles.dotTaken : isCurrent ? styles.dotCurrent : styles.dotRemaining,
                ]}
              />
            )
          })}
        </View>
        <Text style={styles.progressText}>{takenCount} of 4 photos taken</Text>

        {/* Ground */}
        <Text style={styles.sectionLabel}>Ground</Text>
        <TouchableOpacity
          style={styles.groundField}
          onPress={() => navigation.navigate('GroundSearch', {
            currentLocationName: locationName,
            currentLat: location?.lat,
            currentLng: location?.lng,
          })}
          activeOpacity={0.7}
        >
          <View style={styles.groundLeft}>
            {ground.mode === 'gps' ? (
              <>
                <Text style={[styles.groundText, locationLoading && styles.groundTextMuted]}>
                  📍 {locationLoading ? 'Fetching your location...' : 'Using your current location'}
                </Text>
                {!locationLoading && (
                  <Text style={styles.coordsText}>{locationName}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.groundText}>📍 {ground.name}</Text>
                <Text style={styles.coordsText}>
                  {`${Math.abs(ground.lat).toFixed(4)}°${ground.lat >= 0 ? 'N' : 'S'} ${Math.abs(ground.lng).toFixed(4)}°${ground.lng >= 0 ? 'E' : 'W'}`}
                </Text>
              </>
            )}
          </View>
          {ground.mode === 'gps' ? (
            !locationLoading && <Text style={styles.searchLink}>Search →</Text>
          ) : (
            <TouchableOpacity onPress={() => groundStore.resetToGPS()} activeOpacity={0.7}>
              <Text style={styles.resetLink}>Use my location</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Match format */}
        <Text style={styles.sectionLabel}>Match format</Text>
        <View style={styles.formatGrid}>
          <View style={styles.formatRow}>
            {PRESET_FORMATS.slice(0, 2).map(({ label, value, overs: ov }) => (
              <TouchableOpacity
                key={value}
                style={[styles.formatBtn, selectedFormat === value ? styles.formatBtnSelected : styles.formatBtnUnselected]}
                onPress={() => { setSelectedFormat(value); setOvers(ov) }}
                activeOpacity={0.7}
              >
                <Text style={[styles.formatBtnText, selectedFormat === value ? styles.formatTextSelected : styles.formatTextUnselected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formatRow}>
            {PRESET_FORMATS.slice(2).map(({ label, value, overs: ov }) => (
              <TouchableOpacity
                key={value}
                style={[styles.formatBtn, selectedFormat === value ? styles.formatBtnSelected : styles.formatBtnUnselected]}
                onPress={() => { setSelectedFormat(value); setOvers(ov) }}
                activeOpacity={0.7}
              >
                <Text style={[styles.formatBtnText, selectedFormat === value ? styles.formatTextSelected : styles.formatTextUnselected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.formatBtn, selectedFormat === 'custom' ? styles.formatBtnSelected : styles.formatBtnUnselected]}
              onPress={() => setSelectedFormat('custom')}
              activeOpacity={0.7}
            >
              <Text style={[styles.formatBtnText, selectedFormat === 'custom' ? styles.formatTextSelected : styles.formatTextUnselected]}>
                {customBtnLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedFormat === 'custom' && (
          <>
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Overs..."
                placeholderTextColor={theme.text.muted}
                value={customOversText}
                onChangeText={handleCustomOversChange}
                autoFocus
              />
              <Text style={styles.customInputLabel}>overs per side</Text>
            </View>
            {customOversText.length > 0 && !customOversValid && (
              <Text style={styles.validationError}>Please enter between 5 and 100 overs</Text>
            )}
          </>
        )}

        <SquadInput />
      </ScrollView>

      {/* Analyse button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.analyseBtn, canAnalyse ? styles.analyseBtnActive : styles.analyseBtnDisabled]}
          onPress={handleAnalyse}
          disabled={!canAnalyse}
          activeOpacity={0.85}
        >
          <Text style={styles.analyseBtnText}>
            {!allTaken
              ? 'Take all 4 photos to analyse'
              : selectedFormat === 'custom' && !customOversValid
                ? 'Enter overs to continue'
                : 'Analyse pitch'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.soil,
  },
  navBar: {
    backgroundColor: theme.green.dark,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: {
    color: theme.white,
    fontSize: 18,
    fontWeight: '500',
  },
  navSubtitle: {
    color: theme.green.light,
    fontSize: 11,
    marginTop: 2,
  },
  historyIcon: {
    fontSize: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.soilDark,
    marginBottom: 8,
    marginTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    width: '48.5%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  slotEmpty: {
    backgroundColor: '#e8e0d0',
    borderWidth: 1.5,
    borderColor: '#c4b89a',
    borderStyle: 'dashed',
  },
  slotTaken: {
    borderWidth: 0,
  },
  slotImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.green.mid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    color: theme.white,
    fontSize: 12,
    fontWeight: '500',
  },
  retakeText: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '500',
  },
  slotTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slotTagText: {
    color: theme.white,
    fontSize: 10,
    fontWeight: '600',
  },
  slotIcon: {
    fontSize: 24,
    marginBottom: 4,
    color: '#9a8a70',
  },
  slotStatusText: {
    fontSize: 11,
    color: '#9a8a70',
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotTaken: {
    width: 8,
    backgroundColor: theme.green.mid,
  },
  dotCurrent: {
    width: 24,
    backgroundColor: theme.sky,
  },
  dotRemaining: {
    width: 8,
    backgroundColor: '#d4c9b0',
  },
  progressText: {
    fontSize: 12,
    color: theme.text.muted,
    marginBottom: 4,
  },
  groundField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.soilBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  groundLeft: {
    flex: 1,
  },
  groundText: {
    fontSize: 15,
    color: theme.text.mid,
  },
  groundTextMuted: {
    color: theme.text.muted,
  },
  coordsText: {
    fontSize: 10,
    color: theme.text.muted,
    marginTop: 2,
  },
  searchLink: {
    fontSize: 12,
    color: theme.skyDark,
    paddingLeft: 10,
  },
  resetLink: {
    fontSize: 12,
    color: theme.text.muted,
    paddingLeft: 10,
  },
  formatGrid: {
    gap: 8,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  formatBtnSelected: {
    backgroundColor: theme.green.mid,
    borderColor: theme.green.mid,
  },
  formatBtnUnselected: {
    backgroundColor: theme.white,
    borderColor: theme.soilBorder,
  },
  formatBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formatTextSelected: {
    color: theme.white,
  },
  formatTextUnselected: {
    color: theme.soilDark,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.soilBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text.dark,
    padding: 0,
  },
  customInputLabel: {
    fontSize: 13,
    color: theme.soilDark,
    marginLeft: 8,
  },
  validationError: {
    fontSize: 11,
    color: '#c0392b',
    marginTop: 5,
  },
  footer: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: theme.soil,
    borderTopWidth: 1,
    borderTopColor: theme.soilBorder,
  },
  analyseBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  analyseBtnActive: {
    backgroundColor: theme.green.mid,
  },
  analyseBtnDisabled: {
    backgroundColor: '#c4b89a',
  },
  analyseBtnText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
