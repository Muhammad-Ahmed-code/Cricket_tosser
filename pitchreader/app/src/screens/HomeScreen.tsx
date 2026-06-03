import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { photoStore } from '../lib/photoStore'
import { getCurrentLocation, getLocationName } from '../lib/location'
import { groundStore } from '../lib/groundStore'
import { squadStore } from '../lib/squadStore'
import { usageStore } from '../lib/usageStore'
import SquadInput from '../components/SquadInput'

// Palette extracted from Home.html
const C = {
  cream: '#F1EAD8',
  dark: '#1A0E0C',
  red: '#A8331F',
  tan: '#C2A172',
  mutedText: 'rgba(26,14,12,0.62)',
  dimText: 'rgba(26,14,12,0.40)',
  veryMuted: 'rgba(26,14,12,0.18)',
  cardFill: '#FFF8E8',
  gpsGreen: '#DFF0D2',
  gpsGreenText: '#2E5E20',
  white: '#FFFFFF',
  divider: 'rgba(26,14,12,0.10)',
  slotBorder: 'rgba(26,14,12,0.22)',
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const SLOT_LABELS = ['END · A', 'END · B', 'CLOSE-UP · 01', 'CLOSE-UP · 02']
const PRESET_FORMATS = [
  { num: '20', label: 'T20', value: '20' as const, overs: 20 },
  { num: '40', label: 'T40', value: '40' as const, overs: 40 },
  { num: '50', label: 'ODI', value: '50' as const, overs: 50 },
]

export default function HomeScreen({ navigation }: Props) {
  const [photos, setPhotos] = useState<(string | null)[]>(photoStore.getPhotos())
  const [ground, setGround] = useState(groundStore.getGround())
  const [reportCount, setReportCount] = useState(usageStore.getReportCount())
  const [isSubscribed, setIsSubscribed] = useState(usageStore.getIsSubscribed())
  const [overs, setOvers] = useState(40)
  const [selectedFormat, setSelectedFormat] = useState<'20' | '40' | '50' | 'custom'>('40')
  const [customOversText, setCustomOversText] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState<string>('Fetching location...')
  const [locationLoading, setLocationLoading] = useState(true)

  const fetchLocation = useCallback(async () => {
    setLocationLoading(true)
    try {
      const loc = await getCurrentLocation()
      setLocation(loc)
      const name = await getLocationName(loc.lat, loc.lng)
      setLocationName(name)
    } finally {
      setLocationLoading(false)
    }
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
    const unsubscribe = usageStore.subscribe(() => {
      setReportCount(usageStore.getReportCount())
      setIsSubscribed(usageStore.getIsSubscribed())
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
      {/* ── Header bar ── */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>CRICKET TOSSER · V0.9</Text>
        <View style={styles.headerRight}>
          {isSubscribed ? (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO ✓</Text>
            </View>
          ) : (
            <Text style={styles.freeCountText}>
              {Math.max(0, 3 - reportCount)} of 3 free
            </Text>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('History')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.historyBtn}
          >
            <Text style={styles.historyIcon}>⏱</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <Text style={styles.heroNew}>New</Text>
        <Text style={styles.heroPitch}>pitch report.</Text>
        <Text style={styles.heroSub}>
          Four photos, a venue, a format, your squad. We'll do the rest.
        </Text>
      </View>
      <View style={styles.heroDivider} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── 01 · Pitch photos ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNum}>01</Text>
          <Text style={styles.sectionTitle}>Pitch photos</Text>
          <Text style={styles.sectionRight}>{takenCount} / 4</Text>
        </View>

        <View style={styles.grid}>
          {SLOT_LABELS.map((label, index) => (
            <TouchableOpacity
              key={index}
              style={styles.slot}
              onPress={() => handleSlotPress(index)}
              activeOpacity={0.8}
            >
              {photos[index] ? (
                <>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${photos[index]}` }}
                    style={styles.slotImage}
                    resizeMode="cover"
                  />
                  <View style={styles.slotOverlayLabel}>
                    <Text style={styles.slotOverlayLabelText}>{label}</Text>
                  </View>
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                  <View style={styles.retakePill}>
                    <Text style={styles.retakePillText}>RETAKE</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.slotLabel}>{label}</Text>
                  <View style={styles.plusCircle}>
                    <Text style={styles.plusSign}>+</Text>
                  </View>
                  <Text style={styles.tapToAdd}>Tap to add</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 02 · Location ── */}
        <View style={[styles.sectionHeader, styles.sectionSpacing]}>
          <Text style={styles.sectionNum}>02</Text>
          <Text style={styles.sectionTitle}>Location</Text>
          {ground.mode === 'gps' && !locationLoading && (
            <View style={styles.gpsPill}>
              <Text style={styles.gpsPillText}>GPS · ON</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.locationCard}
          onPress={() => navigation.navigate('GroundSearch', {
            currentLocationName: locationName,
            currentLat: location?.lat,
            currentLng: location?.lng,
          })}
          activeOpacity={0.75}
        >
          <Text style={styles.venueLabel}>VENUE</Text>
          {ground.mode === 'gps' ? (
            <>
              <Text style={[styles.venueName, locationLoading && styles.venueNameMuted]}>
                {locationLoading ? 'Fetching location…' : locationName}
              </Text>
              {!locationLoading && (
                <Text style={styles.venueAction}>Search for a ground →</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.venueName}>{ground.name}</Text>
              <Text style={styles.venueCoords}>
                {`${Math.abs(ground.lat).toFixed(4)}° ${ground.lat >= 0 ? 'N' : 'S'} · ${Math.abs(ground.lng).toFixed(4)}° ${ground.lng >= 0 ? 'E' : 'W'}`}
              </Text>
              <TouchableOpacity
                onPress={() => groundStore.resetToGPS()}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.venueAction}>Use my current location</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>

        {/* ── 03 · Match format ── */}
        <View style={[styles.sectionHeader, styles.sectionSpacing]}>
          <Text style={styles.sectionNum}>03</Text>
          <Text style={styles.sectionTitle}>Match format</Text>
        </View>

        <View style={styles.formatRow}>
          {PRESET_FORMATS.map(({ num, label, value, overs: ov }) => {
            const selected = selectedFormat === value
            return (
              <TouchableOpacity
                key={value}
                style={[styles.formatBtn, selected ? styles.formatBtnActive : styles.formatBtnIdle]}
                onPress={() => { setSelectedFormat(value); setOvers(ov) }}
                activeOpacity={0.75}
              >
                <Text style={[styles.formatNum, selected ? styles.formatNumActive : styles.formatNumIdle]}>
                  {num}
                </Text>
                <Text style={[styles.formatLabel, selected ? styles.formatLabelActive : styles.formatLabelIdle]}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity
            style={[styles.formatBtn, selectedFormat === 'custom' ? styles.formatBtnActive : styles.formatBtnIdle]}
            onPress={() => setSelectedFormat('custom')}
            activeOpacity={0.75}
          >
            <Text style={[styles.formatNum, selectedFormat === 'custom' ? styles.formatNumActive : styles.formatNumIdle]}>
              {selectedFormat === 'custom' && customOversValid ? `${customOversNum}` : '·'}
            </Text>
            <Text style={[styles.formatLabel, selectedFormat === 'custom' ? styles.formatLabelActive : styles.formatLabelIdle]}>
              CUSTOM
            </Text>
          </TouchableOpacity>
        </View>

        {selectedFormat === 'custom' && (
          <>
            <View style={styles.customRow}>
              <TextInput
                style={styles.customInput}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Overs…"
                placeholderTextColor={C.dimText}
                value={customOversText}
                onChangeText={handleCustomOversChange}
                autoFocus
              />
              <Text style={styles.customSuffix}>overs per side</Text>
            </View>
            {customOversText.length > 0 && !customOversValid && (
              <Text style={styles.validationError}>Enter between 5 and 100 overs</Text>
            )}
          </>
        )}

        {/* ── 04 · Squad ── */}
        <View style={[styles.sectionHeader, styles.sectionSpacing]}>
          <Text style={styles.sectionNum}>04</Text>
          <Text style={styles.sectionTitle}>Squad</Text>
          <View style={styles.optionalPill}>
            <Text style={styles.optionalPillText}>OPTIONAL</Text>
          </View>
        </View>

        <SquadInput />

      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={styles.bottomBar}>
        <View style={styles.photoCountBox}>
          <Text style={styles.photoCountText}>{takenCount}/4 PHOTOS</Text>
        </View>
        <View style={styles.bottomSep} />
        <TouchableOpacity
          style={[styles.analyzeBtn, canAnalyse ? styles.analyzeBtnActive : styles.analyzeBtnIdle]}
          onPress={handleAnalyse}
          disabled={!canAnalyse}
          activeOpacity={0.85}
        >
          <Text style={[styles.analyzeBtnText, canAnalyse ? styles.analyzeBtnTextActive : styles.analyzeBtnTextIdle]}>
            Analyze pitch
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },

  // ── Header ──────────────────────────────────
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyBtn: {
    padding: 2,
  },
  historyIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    color: C.tan,
  },
  proBadge: {
    backgroundColor: C.gpsGreen,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.gpsGreenText,
  },
  freeCountText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: C.mutedText,
  },

  // ── Hero ────────────────────────────────────
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroNew: {
    fontSize: 38,
    fontWeight: '800',
    color: C.dark,
    lineHeight: 44,
  },
  heroPitch: {
    fontSize: 38,
    fontWeight: '700',
    fontStyle: 'italic',
    color: C.red,
    lineHeight: 44,
    letterSpacing: -1,
    marginTop: -4,
  },
  heroSub: {
    fontSize: 13,
    color: C.mutedText,
    lineHeight: 19,
    marginTop: 8,
    fontWeight: '400',
  },
  heroDivider: {
    height: 1,
    backgroundColor: C.divider,
  },

  // ── Scroll ──────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 28,
  },

  // ── Section headers ─────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 28,
  },
  sectionNum: {
    fontSize: 13,
    fontWeight: '400',
    color: C.tan,
    marginRight: 8,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.dark,
    flex: 1,
    lineHeight: 24,
  },
  sectionRight: {
    fontSize: 12,
    color: C.mutedText,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // ── Photo grid ──────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slot: {
    width: '48.2%',
    aspectRatio: 0.9,
    backgroundColor: C.cardFill,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.slotBorder,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 12,
  },
  slotImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  // Empty slot label (no overlay)
  slotLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: C.tan,
  },
  // Taken slot label (dark overlay pill)
  slotOverlayLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(26,14,12,0.42)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  slotOverlayLabelText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: C.white,
  },
  plusCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: C.slotBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  plusSign: {
    fontSize: 22,
    color: C.dimText,
    lineHeight: 26,
  },
  tapToAdd: {
    fontSize: 11,
    color: C.mutedText,
    fontWeight: '400',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2E6B1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
  },
  retakePill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(26,14,12,0.50)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  retakePillText: {
    fontSize: 9,
    color: C.white,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // ── Location card ───────────────────────────
  gpsPill: {
    backgroundColor: C.gpsGreen,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gpsPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.gpsGreenText,
  },
  locationCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.divider,
  },
  venueLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.tan,
    marginBottom: 5,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.dark,
    marginBottom: 5,
  },
  venueNameMuted: {
    color: C.mutedText,
    fontWeight: '400',
  },
  venueCoords: {
    fontSize: 10,
    color: C.mutedText,
    marginBottom: 8,
  },
  venueAction: {
    fontSize: 12,
    color: C.red,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Format buttons ──────────────────────────
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  formatBtnActive: {
    backgroundColor: C.dark,
    borderColor: C.dark,
  },
  formatBtnIdle: {
    backgroundColor: C.cardFill,
    borderColor: 'rgba(26,14,12,0.14)',
  },
  formatNum: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  formatNumActive: {
    color: C.white,
  },
  formatNumIdle: {
    color: C.dark,
  },
  formatLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginTop: 2,
  },
  formatLabelActive: {
    color: 'rgba(255,255,255,0.65)',
  },
  formatLabelIdle: {
    color: C.tan,
  },

  // ── Custom overs ────────────────────────────
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.divider,
  },
  customInput: {
    flex: 1,
    fontSize: 15,
    color: C.dark,
    padding: 0,
  },
  customSuffix: {
    fontSize: 13,
    color: C.mutedText,
    marginLeft: 8,
  },
  validationError: {
    fontSize: 11,
    color: C.red,
    marginTop: 5,
  },

  // ── Squad optional badge ─────────────────────
  optionalPill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.veryMuted,
  },
  optionalPillText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: C.tan,
  },

  // ── Bottom bar ──────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: C.cream,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  photoCountBox: {
    flex: 1,
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: C.mutedText,
  },
  bottomSep: {
    width: 1,
    height: 28,
    backgroundColor: C.divider,
    marginHorizontal: 4,
  },
  analyzeBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 4,
  },
  analyzeBtnActive: {
    backgroundColor: C.dark,
  },
  analyzeBtnIdle: {
    backgroundColor: C.veryMuted,
  },
  analyzeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  analyzeBtnTextActive: {
    color: C.white,
  },
  analyzeBtnTextIdle: {
    color: C.dimText,
  },
})
