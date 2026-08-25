import React, { useContext, useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native'
import Svg, { Path, Polyline, Line, Defs, RadialGradient, Stop, Polygon } from 'react-native-svg'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth, useUser } from '@clerk/clerk-expo'
import UserAvatar from '../components/UserAvatar'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { theme } from '../theme'
import InsightModal from '../components/InsightModal'
import WeatherStrip from '../components/WeatherStrip'
import { useSupabaseClient } from '../lib/supabaseClient'
import { cancelReminderNotification, scheduleMatchReminderNotification } from '../lib/notificationService'
import { reportHistoryStore } from '../lib/reportHistoryStore'
import { track } from '../lib/analytics'
import { OfflineContext } from '../lib/offlineContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>

const { width: SW } = Dimensions.get('window')
const DRAWER_W = Math.min(SW * 0.86, 330)

function CoinMark({ outer = 38, inner = 34 }: { outer?: number; inner?: number }) {
  const s = inner
  const pts = (
    [[50,0],[89.1,18.8],[98.7,61.1],[71.7,95],[28.3,95],[1.3,61.1],[10.9,18.8]] as [number,number][]
  ).map(([x, y]) => `${+(x*s/100).toFixed(3)},${+(y*s/100).toFixed(3)}`).join(' ')
  const cx = s * 0.38, cy = s * 0.30, r = s * 0.55
  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <RadialGradient id="rcg" cx={`${cx}`} cy={`${cy}`} r={`${r}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor="#b8472f" />
            <Stop offset="45%"  stopColor="#9a3522" />
            <Stop offset="100%" stopColor="#6f2417" />
          </RadialGradient>
        </Defs>
        <Polygon points={pts} fill="url(#rcg)" />
      </Svg>
    </View>
  )
}

const REPORT_SUPPORT_ITEMS = [
  { label: 'How it works',  key: 'howitworks' as const },
  { label: 'Privacy',       key: 'privacy' as const },
  { label: 'Send feedback', key: 'feedback' as const },
]

function BurgerDrawer({
  visible,
  onClose,
  onHome,
  onHistory,
  onSettings,
  onHowItWorks,
  onPrivacy,
  onFeedback,
  onProfile,
}: {
  visible: boolean
  onClose: () => void
  onHome: () => void
  onHistory: () => void
  onSettings: () => void
  onHowItWorks: () => void
  onPrivacy: () => void
  onFeedback: () => void
  onProfile: () => void
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
  }, [visible])

  const handleItem = (key: string | null) => {
    onClose()
    if (key === 'home')        setTimeout(onHome, 260)
    if (key === 'history')     setTimeout(onHistory, 260)
    if (key === 'settings')    setTimeout(onSettings, 260)
    if (key === 'howitworks')  setTimeout(onHowItWorks, 260)
    if (key === 'privacy')     setTimeout(onPrivacy, 260)
    if (key === 'feedback')    setTimeout(onFeedback, 260)
    if (key === 'profile')     setTimeout(onProfile, 260)
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={drawerSt.overlay} onPress={onClose}>
        <Animated.View style={[drawerSt.drawer, { transform: [{ translateX: tx }] }]}>
          <Pressable style={{ flex: 1 }} onPress={() => {}}>
            <View style={[drawerSt.top, { paddingTop: insets.top + 4 }]}>
              <UserAvatar imageUrl={user?.imageUrl} name={user?.fullName || user?.firstName} size={40} onPress={() => handleItem('profile')} />
              <View style={{ flex: 1 }}>
                <Text style={drawerSt.appName}>Cricket Tosser</Text>
                <Text style={drawerSt.tagline}>Read the pitch. Win the toss.</Text>
              </View>
              <TouchableOpacity style={drawerSt.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={drawerSt.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={drawerSt.nav} showsVerticalScrollIndicator={false}>
              <Text style={drawerSt.group}>PRIMARY</Text>
              {[
                { label: 'New pitch report', key: 'home' },
                { label: 'Report history',   key: 'history' },
                { label: 'Settings',         key: 'settings' },
              ].map(item => (
                <TouchableOpacity key={item.label} style={drawerSt.navRow} onPress={() => handleItem(item.key)} activeOpacity={0.7}>
                  <Text style={drawerSt.navLabel}>{item.label}</Text>
                  <Text style={drawerSt.navChev}>❯</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 16 }} />
              <Text style={drawerSt.group}>SUPPORT</Text>
              {REPORT_SUPPORT_ITEMS.map(item => (
                <TouchableOpacity key={item.label} style={drawerSt.navRow} onPress={() => handleItem(item.key)} activeOpacity={0.7}>
                  <Text style={drawerSt.navLabel}>{item.label}</Text>
                  <Text style={drawerSt.navChev}>❯</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[drawerSt.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              <CoinMark outer={18} inner={16} />
              <Text style={drawerSt.footText}>Cricket Tosser · v0.9</Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const drawerSt = StyleSheet.create({
  overlay: {
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D4C5',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#104020',
  },
  tagline: {
    fontSize: 12,
    fontWeight: '400',
    color: '#52624A',
    marginTop: 2,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#D8D4C5',
    backgroundColor: '#F7F2E8',
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 15, color: '#52624A', lineHeight: 19 },
  nav: { padding: 14, paddingBottom: 20 },
  group: {
    fontSize: 11,
    fontWeight: '700',
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
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#52624A',
  },
  navChev: { fontSize: 18, color: '#708040' },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#D8D4C5',
  },
  footText: { fontSize: 12, fontWeight: '500', color: '#9AA18C' },
})

function formatReportDate(iso: string | null): string {
  if (!iso) return 'just now'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 120_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`
  const sameDay = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `today, ${time}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getConfidencePct(confidence: string, confidencePct?: number): number {
  if (confidencePct && confidencePct >= 50 && confidencePct <= 95) {
    return confidencePct
  }
  switch (confidence?.toLowerCase()) {
    case 'high':   return 78
    case 'medium': return 63
    case 'low':    return 54
    default:       return 60
  }
}

const meterStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.cream,
  },
  symbolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symbol: {
    fontSize: 22,
  },
  iconImage: {
    width: 28,
    height: 28,
  },
  decisionText: {
    fontSize: 16,
    fontWeight: '800',
  },
  barTrack: {
    height: 12,
    borderRadius: 999,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barLabel: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
  },
})

function ConfidenceMeter({ decision, confidence, confidencePct }: {
  decision: string
  confidence: string
  confidencePct?: number
}) {
  if (!confidence && !confidencePct) return null

  const animValue = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const pct = getConfidencePct(confidence, confidencePct)
    const batProportion = decision?.toLowerCase() === 'bat'
      ? pct / 100
      : (100 - pct) / 100

    Animated.timing(animValue, {
      toValue: batProportion,
      duration: 600,
      useNativeDriver: false,
    }).start()
  }, [decision, confidence, confidencePct])

  const pct = getConfidencePct(confidence, confidencePct)
  const decisionLower = decision?.toLowerCase() ?? ''
  const capitalizedConfidence = confidence
    ? confidence.charAt(0).toUpperCase() + confidence.slice(1)
    : ''

  const batFlex = animValue
  const bowlFlex = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  })

  const batOpacity = decisionLower === 'bat' ? 1.0 : 0.35
  const bowlOpacity = decisionLower === 'bowl' ? 1.0 : 0.35
  const decisionColor = decisionLower === 'bat' ? '#507020' : '#903020'
  const decisionLabel = decisionLower === 'bat' ? 'Bat first' : 'Bowl first'

  return (
    <View style={meterStyles.container}>
      <View style={meterStyles.symbolRow}>
        <Image
          source={require('../../assets/cricket-bat.png')}
          style={[meterStyles.iconImage, { opacity: batOpacity }]}
          resizeMode="contain"
        />
        <Text style={[meterStyles.decisionText, { color: decisionColor }]}>
          {decisionLabel}
        </Text>
        <Image
          source={require('../../assets/cricket-ball.png')}
          style={[meterStyles.iconImage, { opacity: bowlOpacity }]}
          resizeMode="contain"
        />
      </View>
      <View style={meterStyles.barTrack}>
        <Animated.View style={{ flex: batFlex, backgroundColor: '#507020' }} />
        <Animated.View style={{ flex: bowlFlex, backgroundColor: '#903020' }} />
      </View>
      <Text style={meterStyles.barLabel}>
        {capitalizedConfidence} confidence · {pct}% {decisionLower}
      </Text>
    </View>
  )
}

function buildMatchSummary(data: {
  firstRuns: number | null
  firstWickets: number | null
  secondRuns: number | null
  secondWickets: number | null
} | null): string {
  if (!data) return 'Your match result has been saved'
  const { firstRuns, firstWickets, secondRuns, secondWickets } = data
  if (firstRuns === null && secondRuns === null) return 'Your match result has been saved'
  const fmt = (runs: number | null, wkts: number | null) =>
    runs !== null ? `${runs}/${wkts !== null ? wkts : '—'}` : null
  const s1 = fmt(firstRuns, firstWickets)
  const s2 = fmt(secondRuns, secondWickets)
  if (s1 && s2) return `1st innings: ${s1} · 2nd innings: ${s2}`
  if (s1) return `1st innings: ${s1}`
  return 'Your match result has been saved'
}

const PHOTO_LABELS = ['END·A', 'END·B', 'CLOSE-UP·01', 'CLOSE-UP·02']

export default function ReportScreen({ route, navigation }: Props) {
  const { result, teamResult, groundName, overs, squad, reportId, scrollToToss, scrollToMatch, photoUris } = route.params
  const { isSignedIn, userId } = useAuth()
  const supabase = useSupabaseClient()
  const { isOffline } = useContext(OfflineContext)
  const insets = useSafeAreaInsets()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Pitch photo lightbox
  const [lightboxUri, setLightboxUri] = useState<string | null>(null)
  const [lightboxLabel, setLightboxLabel] = useState('')

  // Toss report (Stage 1) state
  const [tossWon, setTossWon] = useState<'yes' | 'no' | null>(null)
  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl' | null>(null)
  const [captainChoice, setCaptainChoice] = useState<'bat' | 'bowl' | null>(null)
  const [tossReportCompleted, setTossReportCompleted] = useState(false)
  const [tossReportSaving, setTossReportSaving] = useState(false)
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)

  // Auto-scroll to toss/match cards when deep-linked from history
  const [tossCardY, setTossCardY] = useState<number | null>(null)
  const [matchCardY, setMatchCardY] = useState<number | null>(null)

  // Stage 2 unlock animation — two native-driver values so we can pulse scale separately
  const unlockOpacityAnim = useRef(new Animated.Value(0)).current
  const unlockScaleAnim   = useRef(new Animated.Value(0.95)).current
  const toastAnim         = useRef(new Animated.Value(0)).current
  // Tracks whether the unlock was live (user just submitted) vs pre-loaded (Supabase/history)
  const hasSubmittedTossRef = useRef(false)

  // Match Report (Stage 2) completion state
  const [matchCompleted, setMatchCompleted] = useState(false)
  const [matchInningsData, setMatchInningsData] = useState<{
    firstRuns: number | null
    firstWickets: number | null
    secondRuns: number | null
    secondWickets: number | null
  } | null>(null)
  const matchCompletedOpacity = useRef(new Animated.Value(0)).current
  // Ref mirror of matchCompleted for use in focus listener (no closure stale-state issue)
  const matchCompletedRef = useRef(false)
  // Tracks whether match was completed live this session (vs pre-loaded from history)
  const hasSubmittedMatchRef = useRef(false)
  // Set to true when navigating to ReviewScreen from the completed card (edit flow)
  const isEditingMatchRef = useRef(false)
  // Toast shown on ReportScreen after a successful match result edit
  const matchUpdateToastAnim = useRef(new Animated.Value(0)).current

  // Load existing review on mount to hydrate Stage 1 + Stage 2 state
  useEffect(() => {
    if (!reportId || !isSignedIn) return
    ;(async () => {
      const [supabaseResult, localEntries] = await Promise.all([
        supabase
          .from('reviews')
          .select('id, toss_won, toss_decision, captain_choice, toss_report_completed, match_won, first_innings_runs, first_innings_wickets, second_innings_runs, second_innings_wickets')
          .eq('report_id', reportId)
          .maybeSingle(),
        reportHistoryStore.getAll(),
      ])
      const data = supabaseResult.data
      const localEntry = localEntries.find(r => r.id === reportId)
      if (data) {
        setExistingReviewId(data.id)
        setTossWon(data.toss_won === true ? 'yes' : data.toss_won === false ? 'no' : null)
        setTossChoice(data.toss_decision ?? null)
        setCaptainChoice(data.captain_choice ?? null)
        setTossReportCompleted(data.toss_report_completed ?? false)
        // Use local store as final arbiter — markMatchCompleted() is called on every successful submit
        const isMatchDone =
          data.match_won !== null ||
          data.first_innings_runs !== null ||
          localEntry?.match_completed === true
        if (isMatchDone) {
          matchCompletedRef.current = true
          setMatchCompleted(true)
          setMatchInningsData({
            firstRuns: data.first_innings_runs ?? null,
            firstWickets: data.first_innings_wickets ?? null,
            secondRuns: data.second_innings_runs ?? null,
            secondWickets: data.second_innings_wickets ?? null,
          })
        }
      } else if (localEntry?.match_completed) {
        matchCompletedRef.current = true
        setMatchCompleted(true)
      }
    })()
  }, [reportId, isSignedIn])

  // For anonymous users, restore toss_completed + match_completed from local AsyncStorage
  useEffect(() => {
    if (!reportId || isSignedIn) return
    reportHistoryStore.getAll().then(entries => {
      const entry = entries.find(r => r.id === reportId)
      if (entry?.toss_completed) setTossReportCompleted(true)
      if (entry?.match_completed) {
        matchCompletedRef.current = true
        setMatchCompleted(true)
      }
    })
  }, [reportId, isSignedIn])

  // Scroll to toss card when deep-linked via notification or history
  useEffect(() => {
    if (!scrollToToss || tossCardY === null) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: tossCardY - 16, animated: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [scrollToToss, tossCardY])

  // Scroll to match card when deep-linked from history "Add match result"
  useEffect(() => {
    if (!scrollToMatch || matchCardY === null) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: matchCardY - 16, animated: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [scrollToMatch, matchCardY])

  // Show Stage 2 unlocked immediately when: no reportId or toss already done
  // (i.e. all cases that are NOT a live unlock triggered by the user this session)
  useEffect(() => {
    const immediatelyUnlocked = !reportId || tossReportCompleted
    if (immediatelyUnlocked && !hasSubmittedTossRef.current) {
      unlockOpacityAnim.setValue(1)
      unlockScaleAnim.setValue(1)
    }
  }, [reportId, tossReportCompleted])

  // Show match completed card immediately when pre-loaded from history (no animation)
  useEffect(() => {
    if (matchCompleted && !hasSubmittedMatchRef.current) {
      matchCompletedOpacity.setValue(1)
    }
  }, [matchCompleted])

  // When the screen regains focus after returning from ReviewScreen:
  // • If match not yet completed → check local store, mark complete, fade in completed card
  // • If match already completed (edit flow) → refresh innings data, show "updated" toast
  useEffect(() => {
    if (!reportId || !isSignedIn) return
    const unsubscribe = navigation.addListener('focus', async () => {
      if (matchCompletedRef.current) {
        // Edit flow: user returned after editing a previously completed match
        if (!isEditingMatchRef.current) return
        isEditingMatchRef.current = false
        const { data } = await supabase
          .from('reviews')
          .select('first_innings_runs, first_innings_wickets, second_innings_runs, second_innings_wickets')
          .eq('report_id', reportId)
          .maybeSingle()
        if (data) {
          setMatchInningsData({
            firstRuns: data.first_innings_runs ?? null,
            firstWickets: data.first_innings_wickets ?? null,
            secondRuns: data.second_innings_runs ?? null,
            secondWickets: data.second_innings_wickets ?? null,
          })
        }
        Animated.sequence([
          Animated.timing(matchUpdateToastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.delay(1600),
          Animated.timing(matchUpdateToastAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start()
        return
      }

      // First-submission flow: check local store (markMatchCompleted called on every successful submit)
      const localEntries = await reportHistoryStore.getAll()
      const localEntry = localEntries.find(r => r.id === reportId)
      if (!localEntry?.match_completed) return

      const { data } = await supabase
        .from('reviews')
        .select('first_innings_runs, first_innings_wickets, second_innings_runs, second_innings_wickets')
        .eq('report_id', reportId)
        .maybeSingle()

      matchCompletedRef.current = true
      hasSubmittedMatchRef.current = true
      setMatchCompleted(true)
      matchCtaVisibleRef.current = false
      setMatchCTAVisible(false)
      if (data?.first_innings_runs !== null && data?.first_innings_runs !== undefined) {
        setMatchInningsData({
          firstRuns: data.first_innings_runs ?? null,
          firstWickets: data.first_innings_wickets ?? null,
          secondRuns: data.second_innings_runs ?? null,
          secondWickets: data.second_innings_wickets ?? null,
        })
      }
      Animated.timing(matchCompletedOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })
    return unsubscribe
  }, [reportId, isSignedIn])

  const handleSubmitTossReport = async () => {
    if (!reportId) {
      Alert.alert('Unavailable', 'Report ID not available for this session.')
      return
    }
    setTossReportSaving(true)
    try {
      if (isSignedIn) {
        const tossFields = {
          toss_won: tossWon === 'yes' ? true : tossWon === 'no' ? false : null,
          toss_decision: tossChoice,
          captain_choice: tossWon === 'no' ? captainChoice : null,
          toss_report_completed: true,
        }
        if (existingReviewId) {
          const { error } = await supabase
            .from('reviews')
            .update(tossFields)
            .eq('id', existingReviewId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('reviews').insert({
            ...tossFields,
            report_id: reportId,
            user_id: userId,
          })
          if (error) throw error
        }
      }
      setTossReportCompleted(true)
      track('toss_report_completed', {
        toss_won: tossWon === 'yes',
        ...(tossChoice ? { toss_choice: tossChoice } : {}),
        ...(reportId ? { report_id: reportId } : {}),
      })
      // Mark as live unlock so the useEffect doesn't override with setValue
      hasSubmittedTossRef.current = true
      // Spring in the unlocked card, then pulse to draw attention
      Animated.parallel([
        Animated.spring(unlockOpacityAnim, {
          toValue: 1, useNativeDriver: true, tension: 120, friction: 9,
        }),
        Animated.sequence([
          Animated.spring(unlockScaleAnim, {
            toValue: 1, useNativeDriver: true, tension: 120, friction: 9,
          }),
          Animated.timing(unlockScaleAnim, {
            toValue: 1.025, duration: 90, useNativeDriver: true,
          }),
          Animated.spring(unlockScaleAnim, {
            toValue: 1, useNativeDriver: true, tension: 300, friction: 10,
          }),
        ]),
      ]).start()
      // Toast: fade in, hold, fade out
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(toastAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start()
      // Cancel the pending push notification and mark locally
      cancelReminderNotification(reportId)
      reportHistoryStore.markTossCompleted(reportId)
      const matchNotifId = await scheduleMatchReminderNotification(reportId, groundName)
      if (matchNotifId) reportHistoryStore.updateMatchNotificationId(reportId, matchNotifId)
    } catch (err) {
      console.error('[TossReport] save failed:', err)
      Alert.alert('Save failed', 'Please try again.')
    } finally {
      setTossReportSaving(false)
    }
  }

  // Normalise: result may be raw API response ({ prediction, weather }) or the old flat format.
  // Prefer weather_snapshot (explicit generation-time snapshot) with fallback to weather.
  const prediction = result?.prediction ?? {}
  const weather = result?.weather_snapshot ?? result?.weather ?? {}
  const generated_at: string | null = result?.generated_at ?? null

  // Sticky CTA bars
  const scrollYRef = useRef(0)
  const screenHeight = Dimensions.get('window').height

  // Toss CTA
  const ctaVisibleRef = useRef(false)
  const [ctaVisible, setCTAVisible] = useState(false)
  const ctaTranslateY = useRef(new Animated.Value(80)).current

  useEffect(() => {
    Animated.timing(ctaTranslateY, {
      toValue: ctaVisible ? 0 : 80,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [ctaVisible])

  useEffect(() => {
    const shouldShow =
      !!reportId &&
      !tossReportCompleted &&
      (tossCardY === null
        ? !scrollToToss
        : scrollYRef.current + screenHeight < tossCardY - 50)

    if (shouldShow !== ctaVisibleRef.current) {
      ctaVisibleRef.current = shouldShow
      setCTAVisible(shouldShow)
    }
  }, [tossCardY, tossReportCompleted, reportId, scrollToToss])

  // Match CTA
  const matchCtaVisibleRef = useRef(false)
  const [matchCtaVisible, setMatchCTAVisible] = useState(false)
  const matchCtaTranslateY = useRef(new Animated.Value(80)).current

  useEffect(() => {
    Animated.timing(matchCtaTranslateY, {
      toValue: matchCtaVisible ? 0 : 80,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [matchCtaVisible])

  useEffect(() => {
    const shouldShow =
      !!reportId &&
      tossReportCompleted &&
      !matchCompleted &&
      (matchCardY === null
        ? !scrollToMatch
        : scrollYRef.current + screenHeight < matchCardY - 100)

    if (shouldShow !== matchCtaVisibleRef.current) {
      matchCtaVisibleRef.current = shouldShow
      setMatchCTAVisible(shouldShow)
    }
  }, [matchCardY, tossReportCompleted, reportId, scrollToMatch, matchCompleted])

  const [activeTab, setActiveTab] = useState<'general' | 'team'>('general')
  const scrollRef = useRef<ScrollView>(null)

  const switchTab = (tab: 'general' | 'team') => {
    setActiveTab(tab)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }

  const hasTeamTab = teamResult !== null && teamResult !== undefined

  // General prediction fields
  const {
    toss_decision,
    confidence,
    pitch_type,
    behaviour,
    par_score_min,
    par_score_max,
    toss_reasoning_summary,
    toss_reasoning,
    selection_tip,
    weather_impact,
    key_signals = [],
    first_10_overs,
    last_10_overs,
    squad_rating,
    squad_verdict,
    squad_strengths = [],
    squad_weakness,
    squad_suggestion,
    rain_impact = null,
  } = prediction

  const {
    temp_celsius,
    conditions,
    drying_out,
    forecast_afternoon_temp,
  } = weather

  const tossReasoningDisplay = toss_reasoning_summary ?? toss_reasoning

  const tossLabel = toss_decision === 'bat' ? 'Bat first' : 'Bowl first'

  const confidenceLabel =
    confidence === 'high' ? '⚡ High confidence' :
    confidence === 'low' ? '? Low confidence' :
    '~ Medium confidence'

  // Team tab derived values
  const teamTossLabel = teamResult?.toss_decision === 'bat' ? 'Bat first' : 'Bowl first'
  const teamConfidenceLabel =
    teamResult?.confidence === 'high' ? '⚡ High confidence' :
    teamResult?.confidence === 'low' ? '? Low confidence' :
    '~ Medium confidence'
  const tossConflict = toss_decision && teamResult?.toss_decision && toss_decision !== teamResult?.toss_decision

  const handleShare = () => {
    Share.share({
      message:
        `PitchReader — ${groundName}\n` +
        `Toss: ${tossLabel} (${confidence} confidence)\n` +
        `Par score: ${par_score_min}–${par_score_max} (${overs} overs)\n` +
        `Conditions: ${conditions}, ${temp_celsius}°C\n` +
        `${tossReasoningDisplay}\n` +
        `Powered by PitchReader 🏏`,
    })
  }

  const handleAddMatchResult = () => {
    if (isOffline) {
      Alert.alert('No connection', 'You need an internet connection to add match results.')
      return
    }
    if (!isSignedIn) {
      Alert.alert(
        'Sign in to save match results',
        'Create a free account to track your match history.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'Sign in', onPress: () => navigation.navigate('Auth') },
        ]
      )
      return
    }
    if (!reportId) {
      Alert.alert('Unavailable', 'Report ID not available for this session.')
      return
    }
    if (matchCompleted) {
      isEditingMatchRef.current = true
    }
    navigation.navigate('Review', { reportId, groundName })
  }

  const [modal, setModal] = useState<{
    visible: boolean; title: string; content: string; icon: string; extraContext?: string
  }>({ visible: false, title: '', content: '', icon: '' })

  const openModal = (title: string, content: string, icon: string, extraContext?: string) =>
    setModal({ visible: true, title, content, icon, extraContext })

  const closeModal = () => setModal(m => ({ ...m, visible: false }))

  return (
    <SafeAreaView style={styles.root}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <View style={styles.navStart}>
          <TouchableOpacity
            onPress={() => isOffline ? navigation.goBack() : navigation.navigate('Home')}
            activeOpacity={0.75}
          >
            <Image
              source={require('../../assets/Cricket_Tosser_on_dark_backgrounds_transparent.png')}
              style={styles.navLogoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.navActions}>
          <TouchableOpacity onPress={handleShare} style={styles.navShare}>
            <MaterialIcons name="share" size={22} color="#FFFDF7" />
          </TouchableOpacity>
          {!isOffline && (
            <TouchableOpacity
              style={styles.burgerBtn}
              onPress={() => setDrawerOpen(true)}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={styles.burgerBars}>
                <View style={styles.burgerBar} />
                <View style={styles.burgerBar} />
                <View style={styles.burgerBar} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab toggle — only shown when team analysis is available */}
      {hasTeamTab && (
        <View style={styles.tabToggleContainer}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'general' && styles.tabPillActive]}
            onPress={() => switchTab('general')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabPillText, activeTab === 'general' && styles.tabPillTextActive]}>
              General
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'team' && styles.tabPillActive]}
            onPress={() => switchTab('team')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabPillText, activeTab === 'team' && styles.tabPillTextActive]}>
              My Team
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        scrollEventThrottle={16}
        onScroll={e => {
          const y = e.nativeEvent.contentOffset.y
          scrollYRef.current = y

          if (tossCardY !== null) {
            const shouldShow =
              !!reportId && !tossReportCompleted &&
              y + screenHeight < tossCardY - 50
            if (shouldShow !== ctaVisibleRef.current) {
              ctaVisibleRef.current = shouldShow
              setCTAVisible(shouldShow)
            }
          }

          if (matchCardY !== null) {
            const shouldShow =
              !!reportId && tossReportCompleted && !matchCompleted &&
              y + screenHeight < matchCardY - 100
            if (shouldShow !== matchCtaVisibleRef.current) {
              matchCtaVisibleRef.current = shouldShow
              setMatchCTAVisible(shouldShow)
            }
          }
        }}
      >

        {/* Match metadata */}
        <View style={styles.matchMeta}>
          <Text style={styles.matchMetaLocation} numberOfLines={1}>{groundName}</Text>
          <Text style={styles.matchMetaDetails}>{overs} ov · {formatReportDate(generated_at)}</Text>
        </View>

        {/* Weather strip — shared across both tabs */}
        <WeatherStrip weather={weather} generatedAt={generated_at} />

        {activeTab === 'general' ? (
          <>
            {/* Toss hero card */}
            <TouchableOpacity
              style={styles.heroCard}
              activeOpacity={0.85}
              onPress={() => openModal(
                'Toss decision', tossReasoningDisplay, '🪙',
                "The toss is one of the most important decisions in cricket. On a seam-friendly morning pitch, bowling first lets your seamers exploit conditions before the pitch flattens. On a batting track, batting first sets a target and avoids second innings pressure. Always factor in your team's strengths — if your best bowlers are seamers, a green pitch is gold."
              )}
            >
              <View style={styles.heroTop}>
                <Text style={styles.heroDecision}>{tossLabel}</Text>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.heroPitchType}>{pitch_type}</Text>
                  <Text style={styles.heroChevron}>❯</Text>
                </View>
              </View>
              <Text style={styles.heroReasoning}>{tossReasoningDisplay}</Text>
              <View style={styles.confidencePill}>
                <Text style={styles.confidenceText}>{confidenceLabel}</Text>
              </View>
            </TouchableOpacity>

            {/* Rain Factor card — only shown when rain_impact is non-null */}
            {rain_impact !== null && rain_impact?.affects_toss === true && (
              <View style={styles.rainFactorCard}>
                <View style={styles.rainFactorRow}>
                  <Text style={styles.rainFactorEmoji}>☔</Text>
                  <View style={styles.rainFactorBody}>
                    <Text style={styles.rainFactorTitle}>Rain Factor</Text>
                    <Text style={styles.rainFactorAdvantage}>{rain_impact.dls_advantage}</Text>
                    <Text style={styles.rainFactorRec}>{rain_impact.recommendation}</Text>
                  </View>
                </View>
              </View>
            )}

            <ConfidenceMeter
              decision={toss_decision}
              confidence={confidence}
              confidencePct={prediction.confidence_pct}
            />

            {/* Stats row */}
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={[styles.card, styles.statsCard]}
                activeOpacity={0.7}
                onPress={() => openModal(
                  'Par score',
                  `${par_score_min}–${par_score_max} runs in ${overs} overs`,
                  '📊',
                  'Par score is calculated based on the visible pitch surface, weather conditions, and match format. A seam-friendly pitch in damp conditions typically produces lower scores — batting is harder. A flat dry pitch in good weather produces higher scores. Use this as your target-setting anchor, not a hard ceiling — good batting can always exceed par.'
                )}
              >
                <View style={styles.cardLabelRow}>
                  <Text style={styles.cardLabel}>Par score · {overs} ov</Text>
                  <Text style={styles.cardChevron}>❯</Text>
                </View>
                <Text style={styles.cardValue}>{par_score_min}–{par_score_max}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, styles.statsCard]}
                activeOpacity={0.7}
                onPress={() => openModal(
                  'Selection tip', selection_tip, '👥',
                  'Team selection on match day should always factor in the pitch conditions. A seam-friendly surface rewards pace bowlers who can hit good lengths. A dry spinning track rewards finger spinners with flight and loop. Always pick your best player for the conditions — not just your best player overall.'
                )}
              >
                <View style={styles.cardLabelRow}>
                  <Text style={styles.cardLabel}>Selection tip</Text>
                  <Text style={styles.cardChevron}>❯</Text>
                </View>
                <Text style={styles.cardValue} numberOfLines={2}>{selection_tip}</Text>
              </TouchableOpacity>
            </View>

            {/* Innings cards */}
            <TouchableOpacity
              style={[styles.card, styles.blockCard]}
              activeOpacity={0.7}
              onPress={() => openModal(
                'First 10 overs', first_10_overs, '🏏',
                'The first 10 overs set the tone of the entire match. New ball movement, early wickets, and powerplay scoring rates all stem from how the pitch plays initially. Use this insight to set your field and bowling plan before the game starts.'
              )}
            >
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardSectionLabel}>FIRST 10 OVERS</Text>
                <Text style={styles.cardChevron}>❯</Text>
              </View>
              <Text style={styles.cardBodyText}>{first_10_overs}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, styles.blockCard]}
              activeOpacity={0.7}
              onPress={() => openModal(
                'Last 10 overs', last_10_overs, '💥',
                'The death overs are where matches are won and lost. Knowing whether the pitch will deteriorate (variable bounce, turn, crumbling) or remain true helps you plan your bowling attack and batting lineup order. A deteriorating pitch means your best bowlers should be saved for the end.'
              )}
            >
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardSectionLabel}>LAST 10 OVERS</Text>
                <Text style={styles.cardChevron}>❯</Text>
              </View>
              <Text style={styles.cardBodyText}>{last_10_overs}</Text>
            </TouchableOpacity>

            {/* Behaviour card */}
            <TouchableOpacity
              style={[styles.card, styles.blockCard]}
              activeOpacity={0.7}
              onPress={() => openModal(
                'How it will play', behaviour, '📋', weather_impact
              )}
            >
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardSectionLabel}>HOW IT WILL PLAY</Text>
                <Text style={styles.cardChevron}>❯</Text>
              </View>
              <Text style={styles.cardBodyText}>{behaviour}</Text>
              <View style={styles.divider} />
              <Text style={styles.weatherImpactText}>{weather_impact}</Text>
            </TouchableOpacity>

            {/* Key signals */}
            <TouchableOpacity
              style={[styles.card, styles.blockCard]}
              activeOpacity={0.7}
              onPress={() => openModal(
                'What Cricket Tosser detected',
                key_signals?.join('\n\n') ?? '',
                '👁',
                'These signals are what Claude Vision detected across all 4 photos. The close-up shots reveal surface texture, moisture, and cracks that full-length shots miss. The more photos you provide, the more accurate the read.'
              )}
            >
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardSectionLabel}>WHAT CRICKET TOSSER DETECTED ACROSS 4 PHOTOS</Text>
                <Text style={styles.cardChevron}>❯</Text>
              </View>
              {key_signals.map((signal: string, i: number) => (
                <View key={i} style={styles.signalRow}>
                  <Text style={styles.signalCheck}>✓</Text>
                  <Text style={styles.signalText}>{signal}</Text>
                </View>
              ))}
            </TouchableOpacity>

            {/* Pitch photos — 2×2 grid */}
            {photoUris && photoUris.length > 0 && (
              <View style={[styles.card, styles.blockCard]}>
                <Text style={styles.cardSectionLabel}>PITCH PHOTOS</Text>
                <View style={styles.photoGrid}>
                  {Array.from({ length: Math.ceil(photoUris.length / 2) }, (_, row) => (
                    <View key={row} style={styles.photoRow}>
                      {photoUris.slice(row * 2, row * 2 + 2).map((uri, col) => {
                        const idx = row * 2 + col
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={styles.photoCell}
                            onPress={() => { setLightboxUri(uri); setLightboxLabel(PHOTO_LABELS[idx] ?? `Photo ${idx + 1}`) }}
                            activeOpacity={0.85}
                          >
                            <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                            <Text style={styles.photoLabel}>{PHOTO_LABELS[idx] ?? `Photo ${idx + 1}`}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Squad card */}
            {squad_rating !== null && squad_rating !== undefined && (
              <TouchableOpacity
                style={styles.squadCard}
                onPress={() => {
                  const pace = (squad?.seamers ?? 0) + (squad?.fastAllRounders ?? 0)
                  const spin = (squad?.spinners ?? 0) + (squad?.spinAllRounders ?? 0)
                  openModal(
                    'Squad analysis',
                    `${squad_verdict}\n\n` +
                    `Pace options: ${pace} · Spin options: ${spin}\n\n` +
                    `Strengths:\n${squad_strengths?.map((s: string) => `• ${s}`).join('\n')}\n\n` +
                    `Key concern: ${squad_weakness}\n\n` +
                    `Suggestion: ${squad_suggestion}`,
                    '👥',
                    'Knowing whether your all-rounders bowl pace or spin is crucial — a fast all-rounder on a green seamer is a bonus weapon, while a spin all-rounder on a dusty track can be your match-winner. This breakdown lets Cricket Tosser give you a precise squad rating for the exact conditions.'
                  )
                }}
                activeOpacity={0.85}
              >
                <View style={styles.squadHeader}>
                  <Text style={styles.cardSectionLabel}>YOUR SQUAD FOR THIS PITCH</Text>
                  <Text style={styles.chevron}>❯</Text>
                </View>

                <View style={styles.ratingRow}>
                  <View style={styles.ratingCircle}>
                    <Text style={styles.ratingNum}>{squad_rating}</Text>
                    <Text style={styles.ratingDenom}>/10</Text>
                  </View>
                  <View style={styles.ratingRight}>
                    <Text style={styles.squadVerdict}>{squad_verdict}</Text>
                    {squad_suggestion && (
                      <View style={styles.suggestionPill}>
                        <Text style={styles.suggestionText}>
                          💡 {squad_suggestion}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {squad_strengths?.length > 0 && (
                  <View style={styles.strengthsRow}>
                    {squad_strengths.map((s: string, i: number) => (
                      <View key={i} style={styles.strengthPill}>
                        <Text style={styles.strengthText}>✓ {s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Drying out warning */}
            {drying_out && (
              <View style={styles.dryingCard}>
                <Text style={styles.dryingCardText}>
                  ☀️ This pitch will dry and firm up as the afternoon heats up to {forecast_afternoon_temp}°C. If batting first, expect the second innings to play easier — a good total here is crucial.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* ── My Team tab ── */}

            {/* Team toss card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroDecision}>{teamTossLabel}</Text>
                  {tossConflict && (
                    <View style={styles.tossDiffersBadge}>
                      <Text style={styles.tossDiffersText}>Differs from general</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.heroPitchType}>{pitch_type}</Text>
              </View>
              <Text style={styles.heroReasoning}>{teamResult?.reasoning}</Text>
              <View style={styles.confidencePill}>
                <Text style={styles.confidenceText}>{teamConfidenceLabel}</Text>
              </View>
            </View>

            <ConfidenceMeter
              decision={teamResult?.toss_decision}
              confidence={teamResult?.confidence}
              confidencePct={teamResult?.confidence_pct}
            />

            {/* Squad composition card — shows what was sent to the AI */}
            {squad && (
              <View style={[styles.card, styles.blockCard, styles.squadCompCard]}>
                <Text style={styles.cardSectionLabel}>YOUR SQUAD</Text>
                <View style={styles.squadCompDivider} />
                {[
                  { label: 'Batters',           count: squad.batters },
                  { label: 'Seam all-rounders', count: squad.fastAllRounders },
                  { label: 'Seamers',           count: squad.seamers },
                  { label: 'Spin all-rounders', count: squad.spinAllRounders },
                  { label: 'Spinners',          count: squad.spinners },
                ].map(({ label, count }, i, arr) => (
                  <View
                    key={label}
                    style={[
                      styles.squadCompRow,
                      i < arr.length - 1 && styles.squadCompRowBorder,
                    ]}
                  >
                    <Text style={styles.squadCompLabel}>{label}</Text>
                    <Text style={styles.squadCompCount}>{count}</Text>
                  </View>
                ))}
                <View style={styles.squadCompDivider} />
                <View style={styles.squadCompRow}>
                  <Text style={[styles.squadCompLabel, styles.squadCompTotalLabel]}>Total</Text>
                  <Text style={[styles.squadCompCount, styles.squadCompTotalCount]}>
                    {squad.batters + squad.fastAllRounders + squad.spinAllRounders + squad.seamers + squad.spinners}
                  </Text>
                </View>
              </View>
            )}

            {/* Squad summary card */}
            <View style={[styles.card, styles.blockCard]}>
              <Text style={styles.teamCardTitle}>Your squad vs this pitch</Text>
              <Text style={styles.teamCardBody}>{teamResult?.squad_analysis?.summary}</Text>
              {teamResult?.squad_analysis?.toss_advantage ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.teamTossAdvantage}>{teamResult.squad_analysis.toss_advantage}</Text>
                </>
              ) : null}
            </View>

            {/* Bowling plan card */}
            <View style={[styles.card, styles.blockCard]}>
              <Text style={styles.planTitle}>🎳 Bowling plan</Text>
              <Text style={styles.teamCardBody}>{teamResult?.squad_analysis?.bowling_plan}</Text>
            </View>

            {/* Batting plan card */}
            <View style={[styles.card, styles.blockCard]}>
              <Text style={styles.planTitle}>🏏 Batting plan</Text>
              <Text style={styles.teamCardBody}>{teamResult?.squad_analysis?.batting_plan}</Text>
            </View>

            {/* Role tips card */}
            {(teamResult?.squad_analysis?.role_tips?.length ?? 0) > 0 && (
              <View style={[styles.card, styles.blockCard]}>
                <Text style={styles.planTitle}>Role tips</Text>
                {(teamResult?.squad_analysis?.role_tips ?? []).map((tip: string, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.roleTipRow,
                      i < (teamResult?.squad_analysis?.role_tips?.length ?? 0) - 1 && styles.roleTipRowBorder,
                    ]}
                  >
                    <View style={styles.roleTipDot} />
                    <Text style={styles.roleTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Key matchup card (amber) */}
            {teamResult?.squad_analysis?.key_matchup ? (
              <View style={styles.keyMatchupCard}>
                <View style={styles.keyMatchupHeader}>
                  <Text style={styles.keyMatchupIcon}>⚡</Text>
                  <Text style={styles.keyMatchupTitle}>Key matchup</Text>
                </View>
                <Text style={styles.keyMatchupBody}>{teamResult.squad_analysis.key_matchup}</Text>
              </View>
            ) : null}

            {/* Adjusted par score */}
            <TouchableOpacity
              style={[styles.card, styles.blockCard]}
              activeOpacity={0.7}
              onPress={() => openModal(
                'Adjusted par score',
                `${teamResult?.par_score?.low}–${teamResult?.par_score?.high} runs in ${overs} overs\n\nAdjusted based on your squad's batting depth and bowling attack for these specific conditions.`,
                '📊',
                'Par score is adjusted from the general estimate to reflect your squad composition. A batting-heavy side may exceed par by setting a large total; a bowling-heavy squad may benefit from keeping the par score low and defending.'
              )}
            >
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardLabel}>Adjusted par score · {overs} ov</Text>
                <Text style={styles.cardChevron}>❯</Text>
              </View>
              <Text style={styles.cardValue}>
                {teamResult?.par_score?.low}–{teamResult?.par_score?.high}
              </Text>
            </TouchableOpacity>

            {/* Team rain factor card */}
            {teamResult?.rain_impact !== null && teamResult?.rain_impact?.affects_toss === true && (
              <View style={styles.rainFactorCard}>
                <View style={styles.rainFactorRow}>
                  <Text style={styles.rainFactorEmoji}>☔</Text>
                  <View style={styles.rainFactorBody}>
                    <Text style={styles.rainFactorTitle}>Rain Factor</Text>
                    <Text style={styles.rainFactorAdvantage}>{teamResult.rain_impact.dls_advantage}</Text>
                    <Text style={styles.rainFactorRec}>{teamResult.rain_impact.recommendation}</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Stage 1: Toss Report (shared, always below tab content) ── */}
        {!!reportId ? (
          <View
            style={styles.tossReportCard}
            onLayout={e => setTossCardY(e.nativeEvent.layout.y)}
          >
            <View style={styles.tossReportHeader}>
              <Text style={styles.cardSectionLabel}>TOSS REPORT</Text>
              {tossReportCompleted && (
                <View style={styles.tossCompletedBadge}>
                  <Text style={styles.tossCompletedBadgeText}>Completed ✓</Text>
                </View>
              )}
            </View>

            {tossReportCompleted ? (
              <Text style={styles.tossCompletedSummary}>
                {tossWon === 'yes' ? 'Won toss' : 'Lost toss'}
                {tossChoice ? ` · ${tossWon === 'yes' ? 'chose' : 'they chose'} to ${tossChoice}` : ''}
                {tossWon === 'no' && captainChoice ? ` · I'd have ${captainChoice === 'bat' ? 'batted' : 'bowled'}` : ''}
              </Text>
            ) : (
              <>
                <View style={styles.tossField}>
                  <Text style={styles.tossFieldLabel}>Did you win the toss?</Text>
                  <View style={styles.tossToggleRow}>
                    {(['yes', 'no'] as const).map(v => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.tossToggleBtn, tossWon === v && styles.tossToggleBtnActive]}
                        onPress={() => {
                          setTossWon(v)
                          if (v === 'yes') setCaptainChoice(null)
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.tossToggleText, tossWon === v && styles.tossToggleTextActive]}>
                          {v === 'yes' ? 'Yes' : 'No'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.tossField}>
                  <Text style={styles.tossFieldLabel}>
                    {tossWon === 'yes' ? 'What did you choose to do?' : 'What did the opposing captain choose to do?'}
                  </Text>
                  <View style={styles.tossToggleRow}>
                    {(['bat', 'bowl'] as const).map(v => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.tossToggleBtn, tossChoice === v && styles.tossToggleBtnActive]}
                        onPress={() => setTossChoice(v)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.tossToggleText, tossChoice === v && styles.tossToggleTextActive]}>
                          {v === 'bat' ? 'Bat' : 'Bowl'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {tossWon === 'no' && (
                  <View style={styles.tossField}>
                    <Text style={styles.tossFieldLabel}>What would you have done if you won the toss?</Text>
                    <View style={styles.tossToggleRow}>
                      {(['bat', 'bowl'] as const).map(v => (
                        <TouchableOpacity
                          key={v}
                          style={[styles.tossToggleBtn, captainChoice === v && styles.tossToggleBtnActive]}
                          onPress={() => setCaptainChoice(v)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.tossToggleText, captainChoice === v && styles.tossToggleTextActive]}>
                            {v === 'bat' ? 'Bat' : 'Bowl'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.tossSubmitBtn, tossReportSaving && { opacity: 0.6 }]}
                  onPress={handleSubmitTossReport}
                  disabled={tossReportSaving}
                  activeOpacity={0.85}
                >
                  {tossReportSaving ? (
                    <ActivityIndicator color={theme.textInverse} />
                  ) : (
                    <Text style={styles.tossSubmitBtnText}>Submit Toss Report</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {/* ── Stage 2: Match Report ── */}
        {!!reportId && !tossReportCompleted ? (
          /* LOCKED — intentional card, not just a dimmed button */
          <View style={styles.matchReportLockedCard}>
            <View style={styles.matchReportLockedRow}>
              <Text style={styles.matchReportLockedLabel}>MATCH REPORT</Text>
              <Text style={styles.matchReportLockEmoji}>🔒</Text>
            </View>
            <View style={styles.matchReportLockedDivider} />
            <Text style={styles.matchReportHint}>
              Complete the Toss Report above to unlock
            </Text>
          </View>
        ) : (
          /* UNLOCKED — springs in when toss is submitted live; shown instantly from history */
          <Animated.View
            style={[
              styles.matchReportUnlockedCard,
              tossReportCompleted && !matchCompleted && { backgroundColor: '#a8331f', borderColor: '#a8331f' },
              { opacity: unlockOpacityAnim, transform: [{ scale: unlockScaleAnim }] },
            ]}
            onLayout={e => setMatchCardY(e.nativeEvent.layout.y)}
          >
            {/* Floating badge — fades in then out on live unlock; invisible otherwise */}
            <Animated.View
              style={[styles.matchReportUnlockBadge, { opacity: toastAnim }]}
              pointerEvents="none"
            >
              <Text style={styles.matchReportUnlockBadgeText}>🔓 Match Report unlocked!</Text>
            </Animated.View>
            {/* "Match result updated ✓" toast — fades in then out after editing */}
            <Animated.View
              style={[styles.matchReportUnlockBadge, { opacity: matchUpdateToastAnim }]}
              pointerEvents="none"
            >
              <Text style={styles.matchReportUnlockBadgeText}>✓ Match result updated</Text>
            </Animated.View>
            {matchCompleted ? (
              <Animated.View style={{ opacity: matchCompletedOpacity }}>
                <TouchableOpacity
                  style={styles.matchCompletedBody}
                  onPress={handleAddMatchResult}
                  activeOpacity={0.75}
                >
                  <View style={styles.matchCompletedRow}>
                    <MaterialIcons name="check-circle" size={24} color={theme.forest} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.matchCompletedTitle}>Match logged</Text>
                      <Text style={styles.matchCompletedSubtitle}>{buildMatchSummary(matchInningsData)}</Text>
                    </View>
                    <Text style={styles.matchReportBtnChevron}>❯</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={styles.matchReportBtn}
                onPress={handleAddMatchResult}
                activeOpacity={0.8}
              >
                <Text style={[styles.matchReportBtnText, tossReportCompleted && { color: '#FFFFFF' }]}>📋 Add match result</Text>
                <Text style={[styles.matchReportBtnChevron, tossReportCompleted && { color: '#FFFFFF' }]}>❯</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

      </ScrollView>

      {/* Photo lightbox */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.lightboxOverlay} onPress={() => setLightboxUri(null)}>
          <View style={styles.lightboxInner}>
            {lightboxUri && (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.lightboxLabel}>{lightboxLabel}</Text>
          </View>
        </Pressable>
      </Modal>

      {/* Sticky toss CTA bar */}
      {!!reportId && !tossReportCompleted && (
        <Animated.View
          pointerEvents={ctaVisible ? 'auto' : 'none'}
          style={[styles.tossCTABar, { paddingBottom: insets.bottom + 4, transform: [{ translateY: ctaTranslateY }] }]}
        >
          <TouchableOpacity
            style={styles.tossCTAInner}
            activeOpacity={0.85}
            onPress={() => {
              if (tossCardY !== null) {
                scrollRef.current?.scrollTo({ y: tossCardY - 16, animated: true })
              }
            }}
          >
            <View style={styles.tossCTALeft}>
              <Text style={styles.tossCTALabel}>Add toss result</Text>
            </View>
            <Text style={styles.tossCTAArrow}>❯</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sticky match result CTA */}
      {!!reportId && tossReportCompleted && !matchCompleted && (
        <Animated.View
          pointerEvents={matchCtaVisible ? 'auto' : 'none'}
          style={[styles.matchCTABar, { paddingBottom: insets.bottom + 12, transform: [{ translateY: matchCtaTranslateY }] }]}
        >
          <TouchableOpacity
            style={styles.matchCTAInner}
            activeOpacity={0.85}
            onPress={handleAddMatchResult}
          >
            <View style={styles.tossCTALeft}>
              <Text style={styles.matchCTALabel}>Submit match result</Text>
            </View>
            <Text style={styles.matchCTAArrow}>❯</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <InsightModal
        visible={modal.visible}
        onClose={closeModal}
        title={modal.title}
        content={modal.content}
        icon={modal.icon}
        extraContext={modal.extraContext}
      />

      {!isOffline && (
        <BurgerDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onHome={() => navigation.navigate('Home')}
          onHistory={() => navigation.navigate('History')}
          onSettings={() => navigation.navigate('Settings')}
          onHowItWorks={() => navigation.navigate('HowItWorks')}
          onPrivacy={() => navigation.navigate('Privacy')}
          onFeedback={() => navigation.navigate('Feedback')}
          onProfile={() => navigation.navigate('Profile')}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.cream,
  },

  // Nav bar
  navBar: {
    backgroundColor: theme.forest,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navStart: {
    flex: 1,
    alignItems: 'flex-start',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLogoImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginVertical: -12,
  },
  matchMeta: {
    marginBottom: 12,
  },
  matchMetaLocation: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  matchMetaDetails: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  navShare: {
    padding: 4,
    marginRight: 8,
  },
  burgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,253,247,0.2)',
    backgroundColor: 'rgba(255,253,247,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerBars: { gap: 4, alignItems: 'center' },
  burgerBar: { width: 18, height: 2, backgroundColor: '#FFFDF7', borderRadius: 1 },
  // Tab toggle
  tabToggleContainer: {
    backgroundColor: '#F7F2E8',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#D8D4C5',
  },
  tabPillActive: {
    backgroundColor: '#104020',
    borderColor: '#104020',
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52624A',
  },
  tabPillTextActive: {
    color: '#FFFDF7',
    fontWeight: '700',
  },

  // Scroll
  scroll: {
    padding: 14,
    paddingBottom: 80,
  },

  // Rain Factor card
  rainFactorCard: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0AD4E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  rainFactorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rainFactorEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  rainFactorBody: {
    flex: 1,
  },
  rainFactorTitle: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  rainFactorAdvantage: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  rainFactorRec: {
    color: theme.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },

  // Toss hero card (shared by both tabs)
  heroCard: {
    backgroundColor: theme.forest,
    borderRadius: 24,
    padding: 20,
    marginBottom: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroDecision: {
    color: theme.textInverse,
    fontSize: 32,
    fontWeight: '800',
  },
  heroPitchType: {
    color: 'rgba(247,242,232,0.65)',
    fontSize: 10,
    marginTop: 8,
  },
  heroChevron: {
    color: 'rgba(247,242,232,0.40)',
    fontSize: 18,
  },
  heroReasoning: {
    color: 'rgba(247,242,232,0.82)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  confidencePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.ball,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  confidenceText: {
    color: theme.textInverse,
    fontSize: 11,
  },

  // "Differs from general" badge on team toss card
  tossDiffersBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0AD4E',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  tossDiffersText: {
    fontSize: 10,
    color: '#633806',
    fontWeight: '600',
  },

  // Cards
  card: {
    backgroundColor: theme.paper,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 20,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statsCard: {
    flex: 1,
  },
  cardValue: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardLabel: {
    color: theme.textSecondary,
    fontSize: 11,
  },
  blockCard: {
    marginBottom: 8,
  },
  cardLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardChevron: {
    color: theme.textSecondary,
    fontSize: 16,
    lineHeight: 20,
  },
  cardSectionLabel: {
    color: theme.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardBodyText: {
    color: theme.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: theme.line,
    marginVertical: 10,
  },
  weatherImpactText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Signals
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 8,
  },
  signalCheck: {
    color: theme.pitch,
    fontSize: 13,
    lineHeight: 18,
  },
  signalText: {
    color: theme.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },

  // Pitch photos
  photoGrid: {
    marginTop: 10,
    gap: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoCell: {
    flex: 1,
    gap: 4,
  },
  photoThumb: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    backgroundColor: theme.line,
  },
  photoLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: theme.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxInner: {
    width: SW,
    alignItems: 'center',
    gap: 14,
  },
  lightboxImage: {
    width: SW,
    height: SW * 0.75,
  },
  lightboxLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.8,
  },

  // Drying card
  dryingCard: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#F0C14B',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  dryingCardText: {
    color: '#633806',
    fontSize: 13,
    lineHeight: 20,
  },

  // Squad card (general tab)
  squadCard: {
    backgroundColor: theme.paper,
    borderWidth: 0.5,
    borderColor: theme.line,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chevron: {
    color: theme.textSecondary,
    fontSize: 16,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  ratingCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.forest,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexShrink: 0,
  },
  ratingNum: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.textInverse,
  },
  ratingDenom: {
    fontSize: 11,
    color: theme.pitch,
    marginTop: 6,
  },
  ratingRight: { flex: 1 },
  squadVerdict: {
    fontSize: 13,
    color: theme.textPrimary,
    lineHeight: 19,
    marginBottom: 8,
  },
  suggestionPill: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#F0C14B',
    padding: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#633806',
    lineHeight: 17,
  },
  strengthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  strengthPill: {
    backgroundColor: '#E8F2DC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  strengthText: {
    fontSize: 11,
    color: theme.forest,
  },

  // My Team tab — shared card text styles
  teamCardTitle: {
    color: '#104020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  teamCardBody: {
    color: '#52624A',
    fontSize: 13,
    lineHeight: 20,
  },
  teamTossAdvantage: {
    color: '#14351F',
    fontSize: 14,
    lineHeight: 20,
  },
  planTitle: {
    color: '#104020',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  // Squad composition card (My Team tab)
  squadCompCard: {
    marginBottom: 8,
  },
  squadCompDivider: {
    height: 1,
    backgroundColor: '#D8D4C5',
    marginVertical: 10,
  },
  squadCompRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  squadCompRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDEBE2',
  },
  squadCompLabel: {
    fontSize: 13,
    color: '#52624A',
  },
  squadCompCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#104020',
  },
  squadCompTotalLabel: {
    fontWeight: '700',
    color: '#104020',
  },
  squadCompTotalCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#104020',
  },

  // Role tips
  roleTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
  },
  roleTipRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#D8D4C5',
  },
  roleTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#507020',
    marginTop: 7,
    flexShrink: 0,
  },
  roleTipText: {
    color: '#14351F',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Key matchup card (amber)
  keyMatchupCard: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0AD4E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  keyMatchupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  keyMatchupIcon: {
    fontSize: 16,
  },
  keyMatchupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14351F',
  },
  keyMatchupBody: {
    color: '#52624A',
    fontSize: 13,
    lineHeight: 20,
  },

  // Stage 2 — Match Report locked card
  matchReportLockedCard: {
    backgroundColor: '#F2EDE0',
    borderWidth: 1,
    borderColor: '#C8C3B3',
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
    marginTop: 4,
  },
  matchReportLockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchReportLockedLabel: {
    color: '#9AA18C',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  matchReportLockEmoji: {
    fontSize: 15,
    opacity: 0.55,
  },
  matchReportLockedDivider: {
    height: 1,
    backgroundColor: '#C8C3B3',
    marginBottom: 10,
  },
  matchReportHint: {
    fontSize: 12,
    color: '#9AA18C',
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // Stage 2 — Match Report unlocked card
  matchReportUnlockedCard: {
    borderWidth: 1.5,
    borderColor: theme.forest,
    borderRadius: 20,
    backgroundColor: theme.paper,
    marginBottom: 32,
    marginTop: 4,
  },
  matchReportBtn: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchReportBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.forest,
  },
  matchReportBtnChevron: {
    fontSize: 20,
    color: theme.forest,
    lineHeight: 24,
  },
  matchReportUnlockBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: '#E8F2DC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.forest,
    zIndex: 10,
  },
  matchReportUnlockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.forest,
  },

  // Stage 1 — Toss Report card
  tossReportCard: {
    backgroundColor: theme.paper,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  tossReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tossCompletedBadge: {
    backgroundColor: '#E8F2DC',
    borderRadius: theme.radiusPill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tossCompletedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.forest,
  },
  tossCompletedSummary: {
    fontSize: 13,
    color: theme.textSecondary,
    paddingBottom: 2,
  },
  tossField: {
    marginBottom: 14,
  },
  tossFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  tossToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tossToggleBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radiusPill,
    alignItems: 'center',
    backgroundColor: theme.cream,
    borderWidth: 1.5,
    borderColor: theme.line,
  },
  tossToggleBtnActive: {
    backgroundColor: theme.forest,
    borderColor: theme.forest,
  },
  tossToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  tossToggleTextActive: {
    color: theme.textInverse,
  },
  tossSubmitBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 2,
  },
  tossSubmitBtnText: {
    color: theme.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },

  // Sticky toss CTA floating pill
  tossCTABar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tossCTAInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.ball,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  tossCTALeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tossCTAIcon: {
    fontSize: 18,
  },
  tossCTALabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textInverse,
  },
  tossCTAArrow: {
    fontSize: 13,
    color: 'rgba(255,253,247,0.75)',
    fontWeight: '800',
  },

  // Sticky match result CTA (green)
  matchCTABar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  matchCTAInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#a8331f',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  matchCTALabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textInverse,
  },
  matchCTAArrow: {
    fontSize: 15,
    color: 'rgba(255,253,247,0.75)',
    fontWeight: '800',
  },

  // Stage 2 — Match Report completed state
  matchCompletedBody: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  matchCompletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchCompletedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.forest,
  },
  matchCompletedSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
})
