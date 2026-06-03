import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useSupabaseClient } from '../lib/supabaseClient'
import { reportHistoryStore } from '../lib/reportHistoryStore'

const C = {
  cream: '#F1EAD8',
  dark: '#1A0E0C',
  red: '#A8331F',
  tan: '#C2A172',
  mutedText: 'rgba(26,14,12,0.62)',
  dimText: 'rgba(26,14,12,0.40)',
  veryMuted: 'rgba(26,14,12,0.18)',
  divider: 'rgba(26,14,12,0.10)',
  white: '#FFFFFF',
  cardFill: '#FFF8E8',
  green: '#2E6B1F',
  greenBg: '#DFF0D2',
}

interface ReportRow {
  id: string
  ground_name: string
  overs: number
  match_date: string
  created_at: string
  prediction: Record<string, unknown>
  weather: Record<string, unknown>
  reviews: { id: string }[]
}

type Props = NativeStackScreenProps<RootStackParamList, 'History'>

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HistoryScreen({ navigation }: Props) {
  const { isSignedIn } = useAuth()
  const supabase = useSupabaseClient()
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)

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
            .select('id, ground_name, overs, match_date, created_at, prediction, weather, reviews(id)')
            .order('created_at', { ascending: false })
            .limit(50)

          if (data && data.length > 0) {
            const supabaseMap = new Map((data as ReportRow[]).map(r => [r.id, r]))
            const localIds = new Set(localRows.map(r => r.id))

            // Local rows enriched with Supabase reviews where available
            const enriched = localRows.map(local =>
              supabaseMap.has(local.id) ? (supabaseMap.get(local.id) as ReportRow) : local
            )
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
      result: { prediction: report.prediction, weather: report.weather },
      groundName: report.ground_name,
      overs: report.overs,
      squad: null,
      reportId: report.id.startsWith('local_') ? undefined : report.id,
    })
  }

  const handleAddReview = (report: ReportRow) => {
    navigation.navigate('Review', { reportId: report.id, groundName: report.ground_name })
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MATCH HISTORY</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.headerDivider} />

      {!isSignedIn && (
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
          {!isSignedIn && (
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
            const hasReview = report.reviews?.length > 0
            const canReview = !report.id.startsWith('local_')
            const dateStr = report.match_date || report.created_at

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
                  {hasReview ? (
                    <View style={styles.reviewedBadge}>
                      <Text style={styles.reviewedText}>Reviewed ✓</Text>
                    </View>
                  ) : canReview ? (
                    <TouchableOpacity
                      onPress={() => handleAddReview(report)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addReviewText}>+ Add review</Text>
                    </TouchableOpacity>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: { fontSize: 22, color: C.dark, lineHeight: 28 },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: C.tan,
  },
  headerDivider: { height: 1, backgroundColor: C.divider },

  syncBanner: {
    backgroundColor: '#FFF3CD',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0C14B',
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
    borderRadius: 12,
    marginTop: 12,
  },
  signInBtnText: { color: C.white, fontSize: 16, fontWeight: '600' },

  list: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: C.cardFill,
    borderRadius: 12,
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
  tossBowl: { backgroundColor: '#FDE8E8' },
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
  reviewedBadge: {
    backgroundColor: C.greenBg,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reviewedText: { fontSize: 11, fontWeight: '600', color: C.green },
  addReviewText: { fontSize: 12, color: C.red, fontWeight: '500' },
  cardChevron: { fontSize: 18, color: C.mutedText },
})
