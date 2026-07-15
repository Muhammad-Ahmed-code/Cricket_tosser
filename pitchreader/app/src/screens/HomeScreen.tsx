import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import {
  useFonts,
  PlusJakartaSans_800ExtraBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import {
  Inter_700Bold,
  Inter_600SemiBold,
  Inter_500Medium,
  Inter_400Regular,
} from '@expo-google-fonts/inter'
import Svg, { Polygon, Defs, RadialGradient, Stop, Line, Path, Circle } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import UserAvatar from '../components/UserAvatar'

import { photoStore } from '../lib/photoStore'
import { getCurrentLocation, getLocationName } from '../lib/location'
import { groundStore } from '../lib/groundStore'
import { squadStore } from '../lib/squadStore'
import type { Squad } from '../lib/squadStore'
import { usageStore } from '../lib/usageStore'
import { weatherCache } from '../lib/weatherCache'
import { track } from '../lib/analytics'
import SignInPromptModal from '../components/SignInPromptModal'
import AppHeader from '../components/AppHeader'

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_LABELS = ['END · A', 'END · B', 'CLOSE-UP · 01', 'CLOSE-UP · 02']

const PRESET_FORMATS = [
  { num: '20', label: 'T20', value: '20' as const, overs: 20 },
  { num: '40', label: 'T40', value: '40' as const, overs: 40 },
  { num: '50', label: 'ODI', value: '50' as const, overs: 50 },
]

const SQUAD_GROUPS: {
  group: string
  rows: { key: keyof Squad; name: string; desc: string; icon: string }[]
}[] = [
  {
    group: 'PACE',
    rows: [
      { key: 'seamers', name: 'Seamers', desc: 'Pure pace bowlers', icon: 'pace' },
      { key: 'fastAllRounders', name: 'Fast all-rounders', desc: 'Bat + bowl pace', icon: 'bolt' },
    ],
  },
  {
    group: 'SPIN',
    rows: [
      { key: 'spinners', name: 'Spinners', desc: 'Pure spin bowlers', icon: 'spin' },
      { key: 'spinAllRounders', name: 'Spin all-rounders', desc: 'Bat + bowl spin', icon: 'spinAll' },
    ],
  },
  {
    group: 'BATTING',
    rows: [
      { key: 'batters', name: 'Batters', desc: 'Specialist batters', icon: 'bat' },
    ],
  },
]

const SW = Dimensions.get('window').width
const DRAWER_W = Math.min(SW * 0.86, 330)
// Slot width: screen minus 18px padding × 2 sides minus 12px gap between two columns
const SLOT_W = Math.floor((SW - 36 - 12) / 2)

// ─── CoinMark ─────────────────────────────────────────────────────────────────
// Red heptagon "coin-ball" brandmark built with react-native-svg.
function CoinMark({ outer = 38, inner = 34 }: { outer?: number; inner?: number }) {
  const s = inner
  const pts = (
    [[50,0],[89.1,18.8],[98.7,61.1],[71.7,95],[28.3,95],[1.3,61.1],[10.9,18.8]] as [number,number][]
  ).map(([x, y]) => `${+(x*s/100).toFixed(3)},${+(y*s/100).toFixed(3)}`).join(' ')

  const cx = s * 0.38, cy = s * 0.30, r = s * 0.55
  const seamX = s * 0.50, lx1 = s * 0.30, lx2 = s * 0.70
  const y1 = s * 0.12,   y2 = s * 0.88

  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <RadialGradient id="cg" cx={`${cx}`} cy={`${cy}`} r={`${r}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor="#b8472f" />
            <Stop offset="45%"  stopColor="#9a3522" />
            <Stop offset="100%" stopColor="#6f2417" />
          </RadialGradient>
        </Defs>
        <Polygon points={pts} fill="url(#cg)" />
        <Line x1={seamX} y1={y1} x2={seamX} y2={y2} stroke="rgba(255,235,220,0.75)" strokeWidth={2} />
        <Line x1={lx1} y1={y1} x2={lx1} y2={y2} stroke="rgba(255,225,210,0.6)" strokeWidth={1.5} strokeDasharray="3,3" />
        <Line x1={lx2} y1={y1} x2={lx2} y2={y2} stroke="rgba(255,225,210,0.6)" strokeWidth={1.5} strokeDasharray="3,3" />
      </Svg>
    </View>
  )
}

// Mini coin for the ready-state CTA button (18×18)
function MiniCoin() {
  const s = 18
  const pts = (
    [[50,0],[89.1,18.8],[98.7,61.1],[71.7,95],[28.3,95],[1.3,61.1],[10.9,18.8]] as [number,number][]
  ).map(([x, y]) => `${+(x*s/100).toFixed(3)},${+(y*s/100).toFixed(3)}`).join(' ')
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id="mcg" cx={`${s*0.38}`} cy={`${s*0.30}`} r={`${s*0.55}`} gradientUnits="userSpaceOnUse">
          <Stop offset="0%"   stopColor="#c9543b" />
          <Stop offset="100%" stopColor="#8a2f1e" />
        </RadialGradient>
      </Defs>
      <Polygon points={pts} fill="url(#mcg)" />
    </Svg>
  )
}

// ─── Role Icons ───────────────────────────────────────────────────────────────
function RoleIcon({ type }: { type: string }) {
  switch (type) {
    case 'pace': return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M5 14l5-1 4-6" stroke="#903020" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={16} cy={5.5} r={2} stroke="#903020" strokeWidth={1.8} />
        <Path d="M10 13l-2 6M10 13l4 2 1 5" stroke="#903020" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M18 15h3M17 18h2.5" stroke="#903020" strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
      </Svg>
    )
    case 'bolt': return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M13 3L5 13h6l-1 8 8-11h-6l1-7z" stroke="#507020" strokeWidth={1.7} strokeLinejoin="round" />
      </Svg>
    )
    case 'spin': return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3a9 9 0 1 1-6.4 2.6" stroke="#507020" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M12 7a5 5 0 1 0 3.5 1.5" stroke="#507020" strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx={12} cy={12} r={1.6} fill="#507020" />
      </Svg>
    )
    case 'spinAll': return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M4 8a8 8 0 0 1 14-2M20 16A8 8 0 0 1 6 18" stroke="#708040" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M18 3v3.2h-3.2M6 21v-3.2h3.2" stroke="#708040" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    )
    case 'bat': return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 4.5l5 5L10 19l-2.5.5L7 17 14.5 4.5z" stroke="#5B3A22" strokeWidth={1.7} strokeLinejoin="round" />
        <Circle cx={5.5} cy={20} r={1.6} fill="#903020" />
      </Svg>
    )
    default: return null
  }
}

function SquadIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3} stroke="#507020" strokeWidth={1.8} />
      <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="#507020" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={17} cy={9} r={2.4} stroke="#507020" strokeWidth={1.8} />
      <Path d="M16 14.4a4.8 4.8 0 0 1 4.5 4.6" stroke="#507020" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ num, title, meta }: { num: string; title: string; meta?: React.ReactNode }) {
  return (
    <View style={st.secWrap}>
      <Text style={st.secNum}>{num}</Text>
      <Text style={st.secTitle}>{title}</Text>
      {meta}
    </View>
  )
}


// ─── BurgerDrawer ─────────────────────────────────────────────────────────────
const PRIMARY_ITEMS = [
  { label: 'New pitch report', key: 'home',    active: true  },
  { label: 'Report history',   key: 'history', active: false },
  { label: 'Settings',         key: 'settings', active: false },
]
const SUPPORT_ITEMS = [
  { label: 'How it works',  key: 'howitworks' },
  { label: 'Privacy',       key: 'privacy' },
  { label: 'Send feedback', key: 'feedback' },
]

function BurgerDrawer({
  visible,
  onClose,
  onHistory,
  onProfile,
  onHowItWorks,
  onPrivacy,
  onFeedback,
  onSettings,
}: {
  visible: boolean
  onClose: () => void
  onHistory: () => void
  onProfile: () => void
  onHowItWorks: () => void
  onPrivacy: () => void
  onFeedback: () => void
  onSettings: () => void
}) {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const tx = useRef(new Animated.Value(DRAWER_W)).current

  useEffect(() => {
    Animated.timing(tx, {
      toValue: visible ? 0 : DRAWER_W,
      duration: visible ? 260 : 220,
      useNativeDriver: true,
    }).start()
  }, [visible, tx])

  const handleItem = (key: string | null) => {
    onClose()
    if (key === 'history')         setTimeout(onHistory, 260)
    else if (key === 'profile')    setTimeout(onProfile, 260)
    else if (key === 'howitworks') setTimeout(onHowItWorks, 260)
    else if (key === 'privacy')    setTimeout(onPrivacy, 260)
    else if (key === 'feedback')   setTimeout(onFeedback, 260)
    else if (key === 'settings')   setTimeout(onSettings, 260)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={st.drawerOverlay} onPress={onClose}>
        <Animated.View style={[st.drawer, { transform: [{ translateX: tx }] }]}>
          <Pressable style={{ flex: 1 }} onPress={() => {}}>
            {/* Top */}
            <View style={[st.drawerTop, { paddingTop: insets.top + 4 }]}>
              <UserAvatar
                imageUrl={user?.imageUrl}
                name={user?.fullName || user?.firstName}
                size={40}
                onPress={() => handleItem('profile')}
              />
              <View style={{ flex: 1 }}>
                <Text style={st.drawerAppName}>Cricket Tosser</Text>
                <Text style={st.drawerTagline}>Read the pitch. Win the toss.</Text>
              </View>
              <TouchableOpacity style={st.drawerClose} onPress={onClose} activeOpacity={0.7}>
                <Text style={st.drawerCloseX}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Nav */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={st.drawerNav}
              showsVerticalScrollIndicator={false}
            >
              <Text style={st.drawerGroup}>PRIMARY</Text>
              {PRIMARY_ITEMS.map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={[st.navRow, item.active && st.navRowActive]}
                  onPress={() => handleItem(item.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[st.navLabel, item.active && st.navLabelActive]}>{item.label}</Text>
                  {item.active
                    ? <View style={st.navDot} />
                    : <Text style={st.navChev}>›</Text>
                  }
                </TouchableOpacity>
              ))}
              <View style={{ height: 16 }} />
              <Text style={st.drawerGroup}>SUPPORT</Text>
              {SUPPORT_ITEMS.map(item => (
                <TouchableOpacity key={item.label} style={st.navRow} onPress={() => handleItem(item.key)} activeOpacity={0.7}>
                  <Text style={st.navLabel}>{item.label}</Text>
                  <Text style={st.navChev}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={[st.drawerFoot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              <CoinMark outer={18} inner={16} />
              <Text style={st.drawerFootText}>Cricket Tosser · v0.9</Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const { isSignedIn } = useUser()

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    'PlusJakartaSans-Bold':      PlusJakartaSans_700Bold,
    'Inter-Bold':                Inter_700Bold,
    'Inter-SemiBold':            Inter_600SemiBold,
    'Inter-Medium':              Inter_500Medium,
    'Inter-Regular':             Inter_400Regular,
  })

  // ── Existing state ────────────────────────────────────────────────────────
  const [photos, setPhotos]               = useState<(string | null)[]>(photoStore.getPhotos())
  const [ground, setGround]               = useState(groundStore.getGround())
  const [reportCount, setReportCount]     = useState(usageStore.getReportCount())
  const [isSubscribed, setIsSubscribed]   = useState(usageStore.getIsSubscribed())
  const [overs, setOvers]                 = useState(40)
  const [selectedFormat, setSelectedFormat] = useState<'20' | '40' | '50' | 'custom'>('40')
  const [customOversText, setCustomOversText] = useState('')
  const [location, setLocation]           = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName]   = useState<string>('Fetching location...')
  const [locationLoading, setLocationLoading] = useState(true)

  // ── New state ─────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [squadExpanded, setSquadExpanded]   = useState(true)
  const [squad, setSquad]                   = useState<Squad>(() => squadStore.getSquad())
  const [signInModalVisible, setSignInModalVisible] = useState(false)

  // ── Existing store subscriptions ──────────────────────────────────────────
  const fetchLocation = useCallback(async () => {
    setLocationLoading(true)
    try {
      const loc  = await getCurrentLocation()
      setLocation(loc)
      weatherCache.prefetch(loc.lat, loc.lng)
      const name = await getLocationName(loc.lat, loc.lng)
      setLocationName(name)
    } finally {
      setLocationLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = photoStore.subscribe(() => setPhotos([...photoStore.getPhotos()]))
    return unsub
  }, [])

  useEffect(() => {
    const unsub = groundStore.subscribe(() => setGround({ ...groundStore.getGround() }))
    return unsub
  }, [])

  useEffect(() => {
    const unsub = usageStore.subscribe(() => {
      setReportCount(usageStore.getReportCount())
      setIsSubscribed(usageStore.getIsSubscribed())
    })
    return unsub
  }, [])

  useEffect(() => { fetchLocation() }, [fetchLocation])

  // Re-prefetch weather whenever a searched ground is selected
  useEffect(() => {
    if (ground.mode === 'search' && ground.lat !== 0 && ground.lng !== 0) {
      weatherCache.prefetch(ground.lat, ground.lng)
    }
  }, [ground.lat, ground.lng, ground.mode])

  // Reset squad if persisted values somehow sum above 11
  useEffect(() => {
    const total = squad.seamers + squad.fastAllRounders + squad.spinners + squad.spinAllRounders + squad.batters
    if (total > 11) {
      const reset: Squad = { seamers: 0, fastAllRounders: 0, spinners: 0, spinAllRounders: 0, batters: 0 }
      setSquad(reset)
      squadStore.setSquad(reset)
    }
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────
  const takenCount      = photos.filter(Boolean).length
  const allTaken        = takenCount === 4
  const reportsLeft     = Math.max(0, 3 - reportCount)
  const customOversNum  = parseInt(customOversText, 10)
  const customOversValid = !isNaN(customOversNum) && customOversNum >= 5 && customOversNum <= 100
  const canAnalyse      = allTaken && (selectedFormat !== 'custom' || customOversValid)
  const squadTotal      = squad.seamers + squad.fastAllRounders + squad.spinners + squad.spinAllRounders + squad.batters

  // ── Existing handlers ─────────────────────────────────────────────────────
  const handleSlotPress = (index: number) => navigation.navigate('Camera', { slotIndex: index })

  const handleCustomOversChange = (text: string) => {
    setCustomOversText(text)
    const n = parseInt(text, 10)
    if (!isNaN(n) && n >= 5 && n <= 100) setOvers(n)
  }

  const handleAnalyse = () => {
    if (!isSubscribed && reportsLeft === 0) {
      if (!isSignedIn) {
        setSignInModalVisible(true)
        track('sign_in_prompt_shown', { trigger: 'report_limit' })
      } else {
        navigation.navigate('Paywall', { trigger: 'limit_reached' })
      }
      return
    }
    const taken = photoStore.getPhotos().filter(Boolean) as string[]
    photoStore.clearPhotos()
    const g = groundStore.getGround()
    const usingSearch = g.mode === 'search'
    navigation.navigate('Analysing', {
      photos:     taken,
      groundName: usingSearch ? g.name : locationName,
      overs,
      lat:        usingSearch ? g.lat : (location?.lat ?? 52.3555),
      lng:        usingSearch ? g.lng : (location?.lng ?? -1.1743),
      squad:      squadStore.hasSquad() ? squadStore.getSquad() : null,
    })
  }

  // ── Usage counter tap ─────────────────────────────────────────────────────
  const handleFreePillPress = () => {
    track('usage_counter_tapped', {
      auth_state: isSignedIn ? 'signed_in' : 'anonymous',
      reports_used: reportCount,
    })
    if (!isSignedIn) {
      setSignInModalVisible(true)
      track('sign_in_prompt_shown', { trigger: 'usage_counter' })
    } else {
      navigation.navigate('Paywall', { trigger: 'voluntary' })
    }
  }

  // ── Squad handlers ────────────────────────────────────────────────────────
  const updateSquad = (key: keyof Squad, delta: number) => {
    if (delta > 0 && squadTotal >= 11) return
    const next = { ...squad, [key]: Math.max(0, squad[key] + delta) }
    setSquad(next)
    squadStore.setSquad(next)
  }

  if (!fontsLoaded) return null

  return (
    <SafeAreaView style={st.root}>

      {/* ── App header — sticky ── */}
      <AppHeader
        reportsLeft={reportsLeft}
        isSubscribed={isSubscribed}
        onBurger={() => setDrawerOpen(true)}
        onFreePillPress={handleFreePillPress}
      />

      {/* ── Scrollable body ── */}
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero ── */}
        <View style={[st.hero, { paddingHorizontal: 0 }]}>
          <Text style={st.heroNew}>New</Text>
          <Text style={st.heroPitch}>pitch report.</Text>
          <Text style={st.heroSub}>
            Four photos, a venue, a format, your squad. We'll do the rest.
          </Text>
        </View>
        <LinearGradient
          colors={['#D8D4C5', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[st.heroDivider, { marginHorizontal: -18 }]}
        />

        {/* ── 01 · Pitch photos ── */}
        <SectionHeader
          num="01"
          title="Pitch photos"
          meta={<Text style={st.photoMeta}>{takenCount} / 4</Text>}
        />
        {/* 2×2 grid — two explicit rows so flex:1 works cleanly */}
        {[0, 2].map(rowStart => (
          <View key={rowStart} style={st.photoRow}>
            {[rowStart, rowStart + 1].map(index => {
              const photo = photos[index]
              const label = SLOT_LABELS[index]
              return (
                <TouchableOpacity
                  key={index}
                  style={[st.photoSlot, photo ? st.slotFilled : st.slotEmpty]}
                  onPress={() => handleSlotPress(index)}
                  activeOpacity={0.8}
                >
                  {photo ? (
                    <>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${photo}` }}
                        style={st.photoImg}
                        resizeMode="cover"
                      />
                      <View style={st.slotTagPill}>
                        <Text style={st.slotTagPillText}>{label}</Text>
                      </View>
                      <View style={st.slotCheck}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                          <Path d="M5 12.5 l4.5 4.5 L19 7" stroke="#507020" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      </View>
                      <TouchableOpacity
                        style={st.slotRetake}
                        onPress={() => handleSlotPress(index)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                          <Path d="M2 2 L10 10 M10 2 L2 10" stroke="#FFFDF7" strokeWidth={1.8} strokeLinecap="round" />
                        </Svg>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={st.slotTag}>{label}</Text>
                      <View style={st.slotPlus}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                          <Path d="M12 6v12M6 12h12" stroke="#708040" strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                      </View>
                      <Text style={st.slotHint}>Tap to add</Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        ))}

        {/* ── 02 · Location ── */}
        <SectionHeader
          num="02"
          title="Location"
          meta={ground.mode === 'gps' && !locationLoading ? (
            <View style={st.gpsBadge}>
              <View style={st.gpsDot} />
              <Text style={st.gpsBadgeText}>GPS · ON</Text>
            </View>
          ) : undefined}
        />
        <TouchableOpacity
          style={st.locationCard}
          onPress={() => navigation.navigate('GroundSearch', {
            currentLocationName: locationName,
            currentLat:          location?.lat,
            currentLng:          location?.lng,
          })}
          activeOpacity={0.75}
        >
          <Text style={st.venueLabel}>VENUE</Text>
          {ground.mode === 'gps' ? (
            <>
              <Text style={[st.venueName, locationLoading && st.venueNameMuted]}>
                {locationLoading ? 'Fetching location…' : locationName}
              </Text>
              {!locationLoading && (
                <View style={st.venueLink}>
                  <Text style={st.venueLinkText}>Search for a ground</Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M4 12h15M13 6l6 6-6 6" stroke="#903020" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={st.venueName}>{ground.name}</Text>
              <Text style={st.venueCoords}>
                {`${Math.abs(ground.lat).toFixed(4)}° ${ground.lat >= 0 ? 'N' : 'S'} · ${Math.abs(ground.lng).toFixed(4)}° ${ground.lng >= 0 ? 'E' : 'W'}`}
              </Text>
              <TouchableOpacity
                onPress={() => groundStore.resetToGPS()}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={st.venueLink}>
                  <Text style={st.venueLinkText}>Use my current location</Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M4 12h15M13 6l6 6-6 6" stroke="#903020" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>

        {/* ── 03 · Match format ── */}
        <SectionHeader num="03" title="Match format" />
        <View style={st.formatRow}>
          {PRESET_FORMATS.map(({ num, label, value, overs: ov }) => {
            const sel = selectedFormat === value
            return (
              <TouchableOpacity
                key={value}
                style={[st.fmtBtn, sel ? st.fmtBtnSel : st.fmtBtnIdle]}
                onPress={() => { setSelectedFormat(value); setOvers(ov) }}
                activeOpacity={0.75}
              >
                {sel && <View style={st.fmtDot} />}
                <Text style={[st.fmtBig, sel ? st.fmtBigSel : st.fmtBigIdle]}>{num}</Text>
                <Text style={[st.fmtSmall, sel ? st.fmtSmallSel : st.fmtSmallIdle]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity
            style={[st.fmtBtn, selectedFormat === 'custom' ? st.fmtBtnSel : st.fmtBtnIdle]}
            onPress={() => setSelectedFormat('custom')}
            activeOpacity={0.75}
          >
            {selectedFormat === 'custom' && <View style={st.fmtDot} />}
            <Text style={[st.fmtBig, selectedFormat === 'custom' ? st.fmtBigSel : st.fmtBigIdle]}>
              {selectedFormat === 'custom' && customOversValid ? `${customOversNum}` : '·'}
            </Text>
            <Text style={[st.fmtSmall, selectedFormat === 'custom' ? st.fmtSmallSel : st.fmtSmallIdle]}>
              CUSTOM
            </Text>
          </TouchableOpacity>
        </View>
        {selectedFormat === 'custom' && (
          <>
            <View style={st.customRow}>
              <TextInput
                style={st.customInput}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Overs…"
                placeholderTextColor="rgba(82,98,74,0.55)"
                value={customOversText}
                onChangeText={handleCustomOversChange}
                autoFocus
              />
              <Text style={st.customSuffix}>overs per side</Text>
            </View>
            {customOversText.length > 0 && !customOversValid && (
              <Text style={st.validationErr}>Enter between 5 and 100 overs</Text>
            )}
          </>
        )}

        {/* ── 04 · Squad ── */}
        <SectionHeader
          num="04"
          title="Squad"
          meta={squadTotal > 0
            ? <View style={[st.squadTotalPill, squadTotal === 11 && st.squadTotalPillFull]}>
                <Text style={[st.squadTotalText, squadTotal === 11 && st.squadTotalTextFull]}>
                  {squadTotal} / 11
                </Text>
              </View>
            : <View style={st.optBadge}><Text style={st.optBadgeText}>OPTIONAL</Text></View>
          }
        />
        <TouchableOpacity
          style={st.squadHead}
          onPress={() => setSquadExpanded(e => !e)}
          activeOpacity={0.75}
        >
          <View style={st.squadHeadIcon}><SquadIcon /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.squadHeadTitle}>Add your squad</Text>
            <Text style={st.squadHeadSub}>Get a squad rating for this pitch</Text>
          </View>
          <View style={squadExpanded ? st.chevOpen : st.chevClosed}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M6 9l6 6 6-6" stroke="#708040" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </TouchableOpacity>

        {squadExpanded && (
          <View style={st.squadBody}>
            {SQUAD_GROUPS.map(group => (
              <View key={group.group}>
                <Text style={st.squadGroupLabel}>{group.group}</Text>
                {group.rows.map(row => {
                  const val = squad[row.key]
                  return (
                    <View key={row.key} style={st.playerRow}>
                      <View style={st.playerIcon}><RoleIcon type={row.icon} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.playerName}>{row.name}</Text>
                        <Text style={st.playerDesc}>{row.desc}</Text>
                      </View>
                      <View style={st.stepper}>
                        <TouchableOpacity
                          style={[st.stepBtn, val === 0 && st.stepBtnDim]}
                          onPress={() => updateSquad(row.key, -1)}
                          disabled={val === 0}
                          activeOpacity={0.7}
                        >
                          <Text style={st.stepBtnGlyph}>–</Text>
                        </TouchableOpacity>
                        <Text style={st.stepVal}>{val}</Text>
                        <TouchableOpacity
                          style={[st.stepBtn, val > 0 && st.stepBtnOn, squadTotal >= 11 && st.stepBtnDim]}
                          onPress={() => updateSquad(row.key, 1)}
                          disabled={squadTotal >= 11}
                          activeOpacity={0.7}
                        >
                          <Text style={[st.stepBtnGlyph, val > 0 && st.stepBtnGlyphOn]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            ))}
            <View style={st.squadCounterRow}>
              <Text style={[st.squadCounter, squadTotal === 11 && st.squadCounterFull]}>
                {squadTotal} / 11 players selected
              </Text>
              {squadTotal >= 11 && (
                <Text style={st.squadCapMsg}>A team has 11 players</Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={st.bottomBar}>
        <View style={st.photoCounter}>
          <Text style={st.countBig}>{takenCount}/4</Text>
          <Text style={st.countLabel}>PHOTOS</Text>
        </View>
        <View style={st.bottomDiv} />
        <TouchableOpacity
          style={[st.ctaBtn, canAnalyse ? st.ctaReady : st.ctaIdle]}
          onPress={handleAnalyse}
          disabled={!canAnalyse}
          activeOpacity={0.85}
        >
          <Text style={[st.ctaText, canAnalyse ? st.ctaTextReady : st.ctaTextIdle]}>
            Analyze pitch →
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Burger drawer ── */}
      <BurgerDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onHistory={() => navigation.navigate('History')}
        onProfile={() => navigation.navigate('Profile')}
        onHowItWorks={() => navigation.navigate('HowItWorks')}
        onPrivacy={() => navigation.navigate('Privacy')}
        onFeedback={() => navigation.navigate('Feedback')}
        onSettings={() => navigation.navigate('Settings')}
      />

      {/* ── Sign-in prompt modal ── */}
      <SignInPromptModal
        visible={signInModalVisible}
        onSignIn={() => {
          setSignInModalVisible(false)
          navigation.navigate('Auth')
        }}
        onDismiss={() => setSignInModalVisible(false)}
      />

    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F2E8' },

  // Hero
  hero: { paddingTop: 20, paddingHorizontal: 18, paddingBottom: 0 },
  heroNew: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -1.5,
    color: '#104020',
  },
  heroPitch: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -1.5,
    color: '#903020',
    fontStyle: 'italic',
  },
  heroSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: '#52624A',
    marginTop: 14,
    marginBottom: 18,
  },
  heroDivider: { height: 1 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 16 },

  // Section header
  secWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingTop: 22,
    paddingBottom: 14,
  },
  secNum: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 13,
    color: '#708040',
  },
  secTitle: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 21,
    letterSpacing: -0.3,
    color: '#104020',
    flex: 1,
  },
  photoMeta: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#52624A',
  },

  // Photo grid
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photoSlot: {
    width: SLOT_W,
    aspectRatio: 0.9615,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  slotEmpty: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c9c4b2',
  },
  slotFilled: { borderWidth: 0 },
  photoImg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  slotTag: {
    position: 'absolute',
    top: 13, left: 14,
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#507020',
  },
  slotPlus: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5, borderColor: '#D8D4C5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  slotHint: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#52624A' },
  slotTagPill: {
    position: 'absolute',
    top: 13, left: 14,
    backgroundColor: 'rgba(16,64,32,0.5)',
    borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  slotTagPillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(255,253,247,0.82)',
  },
  slotCheck: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFFDF7',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  slotRetake: {
    position: 'absolute',
    top: 10, right: 10,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(10,20,12,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Location
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9f0df',
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
    gap: 6,
  },
  gpsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#507020' },
  gpsBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: '#507020',
  },
  locationCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(216,212,197,0.9)',
    shadowColor: '#104020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  venueLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: '#708040',
    marginBottom: 7,
  },
  venueName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 19,
    letterSpacing: -0.2,
    color: '#14351F',
    marginBottom: 4,
  },
  venueNameMuted: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#52624A',
    letterSpacing: 0,
  },
  venueCoords: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#52624A',
    marginBottom: 8,
  },
  venueLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  venueLinkText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#903020',
  },

  // Format
  formatRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  fmtBtn: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  fmtBtnSel: {
    backgroundColor: '#104020',
    borderColor: '#104020',
    shadowColor: '#104020',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
  fmtBtnIdle: { backgroundColor: '#FFFDF7', borderColor: '#D8D4C5' },
  fmtDot: {
    position: 'absolute',
    top: 9, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#903020',
    borderWidth: 2, borderColor: '#104020',
  },
  fmtBig: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  fmtBigSel:  { color: '#FFFDF7' },
  fmtBigIdle: { color: '#104020' },
  fmtSmall: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 7,
  },
  fmtSmallSel:  { color: 'rgba(255,253,247,0.7)' },
  fmtSmallIdle: { color: '#52624A' },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(208,212,197,0.7)',
  },
  customInput: { flex: 1, fontSize: 15, color: '#104020', padding: 0 },
  customSuffix: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#52624A',
    marginLeft: 8,
  },
  validationErr: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#903020',
    marginTop: 5,
  },

  // Squad section header badges
  squadTotalPill: {
    backgroundColor: '#eef2e6',
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  squadTotalPillFull: {
    backgroundColor: '#104020',
  },
  squadTotalText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 14,
    color: '#507020',
  },
  squadTotalTextFull: {
    color: '#FFFDF7',
  },
  optBadge: {
    borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 4,
    borderWidth: 1, borderColor: '#D8D4C5',
  },
  optBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#52624A',
  },

  // Squad collapsible header card
  squadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFDF7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(216,212,197,0.9)',
    shadowColor: '#104020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    padding: 15,
  },
  squadHeadIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#eef2e6',
    alignItems: 'center', justifyContent: 'center',
  },
  squadHeadTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#104020' },
  squadHeadSub:   { fontFamily: 'Inter-Regular', fontSize: 12.5, color: '#52624A', marginTop: 2 },
  chevClosed: {},
  chevOpen:   { transform: [{ rotate: '180deg' }] },

  // Squad body
  squadBody: { paddingTop: 4 },
  squadCounterRow: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
    gap: 5,
  },
  squadCounter: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#52624A',
  },
  squadCounterFull: {
    fontFamily: 'Inter-Bold',
    color: '#2d5a16',
  },
  squadCapMsg: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: '#708040',
    fontStyle: 'italic',
  },
  squadGroupLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: '#708040',
    marginTop: 16,
    marginBottom: 9,
    marginLeft: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216,212,197,0.85)',
    shadowColor: '#104020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    padding: 12,
    marginBottom: 10,
  },
  playerIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#f1f0e6',
    alignItems: 'center', justifyContent: 'center',
  },
  playerName: { fontFamily: 'Inter-Bold', fontSize: 14.5, color: '#14351F' },
  playerDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#52624A', marginTop: 2 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: '#D8D4C5',
    backgroundColor: '#F7F2E8',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDim: { opacity: 0.4 },
  stepBtnOn:  { backgroundColor: '#507020', borderColor: '#507020' },
  stepBtnGlyph: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#104020',
    lineHeight: 22,
  },
  stepBtnGlyphOn: { color: '#fff' },
  stepVal: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 19,
    color: '#14351F',
    minWidth: 24,
    textAlign: 'center',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,242,232,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#D8D4C5',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  photoCounter: { alignItems: 'center' },
  countBig: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 15,
    color: '#104020',
    letterSpacing: 0.5,
  },
  countLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#52624A',
    letterSpacing: 1,
  },
  bottomDiv: { width: 1, height: 34, backgroundColor: '#D8D4C5' },
  ctaBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  ctaReady: {
    backgroundColor: '#903020',
    shadowColor: '#802020',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 34,
    elevation: 12,
  },
  ctaIdle: { backgroundColor: '#e2ded0' },
  ctaText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ctaTextReady: { color: '#FFFDF7' },
  ctaTextIdle:  { color: '#9a9684' },

  // Burger drawer
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16,64,32,0.42)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: DRAWER_W,
    height: '100%',
    backgroundColor: '#FFFDF7',
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
    overflow: 'hidden',
    shadowColor: '#101e14',
    shadowOffset: { width: -20, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  drawerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D4C5',
  },
  drawerAppName: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 18,
    color: '#104020',
  },
  drawerTagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: '#52624A',
    marginTop: 2,
  },
  drawerClose: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#D8D4C5',
    backgroundColor: '#F7F2E8',
    alignItems: 'center', justifyContent: 'center',
  },
  drawerCloseX: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#52624A',
    lineHeight: 19,
  },
  drawerNav: { padding: 14, paddingBottom: 20 },
  drawerGroup: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#708040',
    letterSpacing: 1.6,
    marginBottom: 4,
    marginLeft: 12,
    marginTop: 4,
  },
  navRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 10,
  },
  navRowActive: { backgroundColor: '#e9f0df' },
  navLabel: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14.5,
    color: '#52624A',
  },
  navLabelActive: {
    fontFamily: 'Inter-SemiBold',
    color: '#104020',
  },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#903020' },
  navChev: { fontSize: 20, color: '#D8D4C5', lineHeight: 22 },
  drawerFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#D8D4C5',
    paddingTop: 14,
    paddingHorizontal: 22,
  },
  drawerFootText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: '#52624A',
  },
})
