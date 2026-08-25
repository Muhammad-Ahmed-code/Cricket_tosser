import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth, useUser } from '@clerk/clerk-expo'
import Svg, { Polygon, Defs, RadialGradient, Stop } from 'react-native-svg'
import UserAvatar from '../components/UserAvatar'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useSupabaseClient } from '../lib/supabaseClient'
import { reportHistoryStore } from '../lib/reportHistoryStore'
import { track } from '../lib/analytics'
import { OfflineContext } from '../lib/offlineContext'
import AppHeader from '../components/AppHeader'

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
          <RadialGradient id="hcg" cx={`${cx}`} cy={`${cy}`} r={`${r}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor="#b8472f" />
            <Stop offset="45%"  stopColor="#9a3522" />
            <Stop offset="100%" stopColor="#6f2417" />
          </RadialGradient>
        </Defs>
        <Polygon points={pts} fill="url(#hcg)" />
      </Svg>
    </View>
  )
}

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
                <TouchableOpacity
                  key={item.label}
                  style={[drawerSt.navRow, item.key === 'history' && drawerSt.navRowActive]}
                  onPress={() => handleItem(item.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[drawerSt.navLabel, item.key === 'history' && drawerSt.navLabelActive]}>
                    {item.label}
                  </Text>
                  {item.key === 'history'
                    ? <View style={drawerSt.navDot} />
                    : <Text style={drawerSt.navChev}>›</Text>
                  }
                </TouchableOpacity>
              ))}
              <View style={{ height: 16 }} />
              <Text style={drawerSt.group}>SUPPORT</Text>
              {[
                { label: 'How it works',  key: 'howitworks' },
                { label: 'Privacy',       key: 'privacy' },
                { label: 'Send feedback', key: 'feedback' },
              ].map(item => (
                <TouchableOpacity key={item.label} style={drawerSt.navRow} onPress={() => handleItem(item.key)} activeOpacity={0.7}>
                  <Text style={drawerSt.navLabel}>{item.label}</Text>
                  <Text style={drawerSt.navChev}>›</Text>
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
  appName: { fontSize: 18, fontWeight: '800', color: '#104020' },
  tagline: { fontSize: 12, fontWeight: '400', color: '#52624A', marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#D8D4C5',
    backgroundColor: '#F7F2E8',
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 15, color: '#52624A', lineHeight: 19 },
  nav: { padding: 14, paddingBottom: 20 },
  group: {
    fontSize: 11, fontWeight: '700', color: '#708040',
    letterSpacing: 1.6, marginBottom: 4, marginLeft: 12, marginTop: 4,
  },
  navRow: {
    height: 50, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, borderRadius: 14, gap: 10,
  },
  navRowActive: { backgroundColor: '#e9f0df' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#52624A' },
  navLabelActive: { fontWeight: '600', color: '#104020' },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#903020' },
  navChev: { fontSize: 18, color: '#708040' },
  foot: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#D8D4C5',
  },
  footText: { fontSize: 12, fontWeight: '500', color: '#9AA18C' },
})

const C = {
  cream:     '#F7F2E8',
  dark:      '#104020',
  red:       '#903020',
  tan:       '#507020',
  mutedText: '#52624A',
  dimText:   'rgba(82,98,74,0.55)',
  veryMuted: 'rgba(208,212,197,0.55)',
  divider:   'rgba(208,212,197,0.60)',
  white:     '#FFFDF7',
  cardFill:  '#FFFDF7',
  green:     '#507020',
  greenBg:   '#E8F2DC',
}

interface ReviewSummary {
  id: string
  toss_report_completed?: boolean
  match_won?: boolean | null
  pitch_rating?: number | null
}

interface ReportRow {
  id: string
  ground_name: string
  overs: number
  match_date: string
  created_at: string
  prediction: Record<string, unknown>
  weather: Record<string, unknown>
  weather_snapshot?: Record<string, unknown> | null
  generated_at?: string | null
  team_prediction?: Record<string, unknown> | null
  squad?: { seamers: number; fastAllRounders: number; spinners: number; spinAllRounders: number; batters: number } | null
  photo_urls?: string[] | null
  reviews: ReviewSummary[]
  toss_completed?: boolean
  match_completed?: boolean
}

type Props = NativeStackScreenProps<RootStackParamList, 'History'>

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HistoryScreen({ navigation }: Props) {
  const { isSignedIn } = useAuth()
  const supabase = useSupabaseClient()
  const { isOffline } = useContext(OfflineContext)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      // Primary: local storage — always works regardless of auth state
      const localEntries = await reportHistoryStore.getAll()
      const localRows: ReportRow[] = localEntries.map(e => ({ ...e, reviews: [] }))
      setReports(localRows)

      // Secondary: Supabase — adds reviews data and cross-device reports
      if (isSignedIn) {
        try {
          const { data } = await supabase
            .from('reports')
            .select('id, ground_name, overs, match_date, created_at, prediction, weather, weather_snapshot, generated_at, team_prediction, photo_urls, reviews(id, toss_report_completed, match_won, pitch_rating)')
            .order('created_at', { ascending: false })
            .limit(50)

          if (data && data.length > 0) {
            const supabaseMap = new Map((data as ReportRow[]).map(r => [r.id, r]))
            const localIds = new Set(localRows.map(r => r.id))

            // Local rows enriched with Supabase reviews where available
            // Prefer local photo_urls (data URIs) when Supabase hasn't finished async PATCH yet
            const enriched = localRows.map(local => {
              if (supabaseMap.has(local.id)) {
                const remote = supabaseMap.get(local.id) as ReportRow
                return { ...remote, photo_urls: remote.photo_urls ?? local.photo_urls }
              }
              return local
            })
            // Supabase rows not in local (e.g. from another device)
            const remoteOnly = (data as ReportRow[]).filter(r => !localIds.has(r.id))

            const merged = [...enriched, ...remoteOnly].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            setReports(merged)
          }
        } catch {
          // Supabase sync failed — local data still shown, no error needed
        }
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, isSignedIn])

  useFocusEffect(
    useCallback(() => {
      loadReports()
    }, [loadReports])
  )

  const handleCardPress = (report: ReportRow) => {
    navigation.navigate('Report', {
      result: { prediction: report.prediction, weather: report.weather, weather_snapshot: report.weather_snapshot ?? null, generated_at: report.generated_at ?? report.created_at },
      teamResult: report.team_prediction ?? undefined,
      groundName: report.ground_name,
      overs: report.overs,
      squad: report.squad ?? null,
      reportId: report.id.startsWith('local_') ? undefined : report.id,
      photoUris: report.photo_urls ?? undefined,
    })
  }

  const handleAddToss = (report: ReportRow) => {
    track('history_stage_tapped', { stage: 'toss', report_id: report.id })
    navigation.navigate('Report', {
      result: { prediction: report.prediction, weather: report.weather, weather_snapshot: report.weather_snapshot ?? null, generated_at: report.generated_at ?? report.created_at },
      teamResult: report.team_prediction ?? undefined,
      groundName: report.ground_name,
      overs: report.overs,
      squad: report.squad ?? null,
      reportId: report.id.startsWith('local_') ? undefined : report.id,
      scrollToToss: true,
      photoUris: report.photo_urls ?? undefined,
    })
  }

  const handleAddMatch = (report: ReportRow) => {
    track('history_stage_tapped', { stage: 'match', report_id: report.id })
    navigation.navigate('Report', {
      result: { prediction: report.prediction, weather: report.weather, weather_snapshot: report.weather_snapshot ?? null, generated_at: report.generated_at ?? report.created_at },
      teamResult: report.team_prediction ?? undefined,
      groundName: report.ground_name,
      overs: report.overs,
      squad: report.squad ?? null,
      reportId: report.id.startsWith('local_') ? undefined : report.id,
      scrollToMatch: true,
      photoUris: report.photo_urls ?? undefined,
    })
  }

  return (
    <SafeAreaView style={styles.root}>
      <AppHeader
        onLogoPress={isOffline ? () => navigation.goBack() : () => navigation.navigate('Home')}
        onBurger={() => setDrawerOpen(true)}
        hideBurger={isOffline}
      />

      {!isSignedIn && !isOffline && (
        <TouchableOpacity style={styles.syncBanner} onPress={() => navigation.navigate('Auth')} activeOpacity={0.8}>
          <Text style={styles.syncBannerText}>Sign in to sync across devices →</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.red} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏏</Text>
          <Text style={styles.emptyTitle}>No analyses yet</Text>
          <Text style={styles.emptySub}>Go read a pitch!</Text>
          {!isSignedIn && !isOffline && (
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={0.85}
            >
              <Text style={styles.signInBtnText}>Sign in</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {reports.map(report => {
            const toss = (report.prediction?.toss_decision as string) ?? ''
            const canReview = !report.id.startsWith('local_')
            const dateStr = report.match_date || report.created_at

            const review = report.reviews?.[0]
            const tossDone = review?.toss_report_completed === true || report.toss_completed === true
            const matchDone = tossDone && (
              (review?.match_won !== null && review?.match_won !== undefined) ||
              report.match_completed === true
            )

            return (
              <TouchableOpacity
                key={report.id}
                style={styles.card}
                onPress={() => handleCardPress(report)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardGround} numberOfLines={1}>
                      {report.ground_name}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatDate(dateStr)} · {report.overs} overs
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[
                      styles.tossBadge,
                      toss === 'bat' ? styles.tossBat : styles.tossBowl,
                    ]}>
                      <Text style={styles.tossBadgeText}>
                        {toss === 'bat' ? 'Bat' : 'Bowl'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  {canReview ? (
                    <View style={styles.stageBadgeRow}>
                      {/* Stage 1: Toss */}
                      {tossDone ? (
                        <View style={styles.stageBadgeDone}>
                          <Text style={styles.stageBadgeDoneText}>🪙 Toss ✓</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleAddToss(report)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.stageActionPill}>
                            <Text style={styles.stageActionPillText}>🪙 Add toss result</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      {/* Stage 2: Match */}
                      {matchDone ? (
                        <View style={styles.stageBadgeDone}>
                          <Text style={styles.stageBadgeDoneText}>📋 Match ✓</Text>
                        </View>
                      ) : tossDone ? (
                        <TouchableOpacity
                          onPress={() => handleAddMatch(report)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.stageActionPill}>
                            <Text style={styles.stageActionPillText}>📋 Add match result</Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.stageBadgeLocked}>
                          <Text style={styles.stageBadgeLockedText}>📋 Match</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View />
                  )}
                  <Text style={styles.cardChevron}>›</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
      {!isOffline && (
        <BurgerDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onHome={() => navigation.navigate('Home')}
          onHistory={() => setDrawerOpen(false)}
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
  root: { flex: 1, backgroundColor: C.cream },

  syncBanner: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0AD4E',
  },
  syncBannerText: {
    fontSize: 12,
    color: '#633806',
    textAlign: 'center',
    fontWeight: '500',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.dark,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: C.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },

  signInBtn: {
    backgroundColor: C.dark,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 12,
  },
  signInBtnText: { color: C.white, fontSize: 16, fontWeight: '600' },

  list: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: C.cardFill,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.divider,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardLeft: { flex: 1, marginRight: 10 },
  cardRight: { alignItems: 'flex-end' },
  cardGround: {
    fontSize: 16,
    fontWeight: '700',
    color: C.dark,
    marginBottom: 4,
  },
  cardMeta: { fontSize: 12, color: C.mutedText },

  tossBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tossBat: { backgroundColor: C.greenBg },
  tossBowl: { backgroundColor: '#EEE8F2' },
  tossBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.dark,
  },

  cardDivider: { height: 1, backgroundColor: C.divider, marginBottom: 10 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageBadgeDone: {
    backgroundColor: '#E8F2DC',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageBadgeDoneText: { fontSize: 11, fontWeight: '700', color: '#104020' },
  stageActionPill: {
    borderWidth: 1,
    borderColor: C.red,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageActionPillText: {
    fontSize: 11,
    color: C.red,
    fontWeight: '600',
  },
  stageBadgeLocked: {
    backgroundColor: 'rgba(208,212,197,0.35)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageBadgeLockedText: {
    fontSize: 11,
    color: C.dimText,
    fontWeight: '600',
  },
  cardChevron: { fontSize: 18, color: C.mutedText },
})
