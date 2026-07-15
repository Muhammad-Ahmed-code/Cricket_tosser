import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useUser, useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useSupabaseClient } from '../lib/supabaseClient'
import { usageStore } from '../lib/usageStore'
import { logoutFromPurchases, restorePurchases } from '../lib/purchases'
import { authStore } from '../lib/authStore'

const C = {
  cream:      '#F7F2E8',
  dark:       '#104020',
  red:        '#903020',
  tan:        '#507020',
  mutedText:  '#52624A',
  dimText:    'rgba(82,98,74,0.55)',
  veryMuted:  'rgba(208,212,197,0.55)',
  cardFill:   '#FFFDF7',
  divider:    'rgba(208,212,197,0.60)',
  soilBorder: 'rgba(208,212,197,0.80)',
  white:      '#FFFDF7',
  proBg:      '#507020',
  proText:    '#FFFDF7',
  freeBg:     'rgba(208,212,197,0.45)',
  greenText:  '#507020',
  greenBg:    '#E8F2DC',
  skeletonBg: 'rgba(208,212,197,0.55)',
}

interface Stats {
  totalReports: number | null
  distinctGrounds: number | null
  totalReviews: number | null
}

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>

function Skel({ w, h = 14 }: { w: number; h?: number }) {
  return <View style={{ width: w, height: h, borderRadius: 4, backgroundColor: C.skeletonBg }} />
}

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useUser()
  const { isSignedIn, signOut } = useAuth()
  const supabase = useSupabaseClient()
  const [isSubscribed, setIsSubscribed] = useState(usageStore.getIsSubscribed())
  const [reportCount, setReportCount] = useState(usageStore.getReportCount())
  const [stats, setStats] = useState<Stats>({ totalReports: null, distinctGrounds: null, totalReviews: null })
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    return usageStore.subscribe(() => {
      setIsSubscribed(usageStore.getIsSubscribed())
      setReportCount(usageStore.getReportCount())
    })
  }, [])

  useEffect(() => {
    if (!isSignedIn || !user?.id) return
    const uid = user.id
    let cancelled = false
    setStatsLoading(true)
    Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('reports').select('ground_name').eq('user_id', uid),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    ])
      .then(([rr, gr, vr]) => {
        if (cancelled) return
        setStats({
          totalReports: rr.count ?? 0,
          distinctGrounds: new Set((gr.data ?? []).map(r => r.ground_name)).size,
          totalReviews: vr.count ?? 0,
        })
      })
      .catch(() => { /* fail silently */ })
      .finally(() => { if (!cancelled) setStatsLoading(false) })
    return () => { cancelled = true }
  }, [isSignedIn, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestorePurchases = async () => {
    try {
      const success = await restorePurchases()
      if (success) {
        await usageStore.setIsSubscribed(true)
        Alert.alert('Purchases restored!', 'Your subscription is active.')
      } else {
        Alert.alert('No subscription found', "We couldn't find an active subscription to restore.")
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again.')
    }
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      "You'll need to sign in again to access your history.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logoutFromPurchases()
            await signOut()
            await usageStore.setIsSubscribed(false)
            authStore.setIsAnonymous(false)
            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })
          },
        },
      ]
    )
  }

  const handleManageSubscription = () => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions'
    Linking.openURL(url)
  }

  const displayName = user?.fullName || user?.firstName || (isSignedIn ? 'User' : 'Guest')
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const imageUrl = user?.imageUrl ?? null
  const initial = (user?.firstName?.[0] || user?.lastName?.[0] || '').toUpperCase()

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
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.headerDivider} />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Avatar + name + email */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarLarge, styles.avatarFallback]}>
                <Text style={styles.avatarInitialText}>{initial || '👤'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {email ? (
            <Text style={styles.emailText}>{email}</Text>
          ) : (
            <Text style={styles.emailText}>Not signed in</Text>
          )}
        </View>

        {/* Plan card */}
        <View style={styles.card}>
          <View style={styles.planRow}>
            <View style={[styles.planBadge, isSubscribed ? styles.planBadgePro : styles.planBadgeFree]}>
              <Text style={[styles.planBadgeText, isSubscribed ? styles.planBadgeTextPro : styles.planBadgeTextFree]}>
                {isSubscribed ? 'Pro ✓' : 'Free Plan'}
              </Text>
            </View>
          </View>

          {isSubscribed ? (
            <>
              <Text style={styles.planDetail}>Unlimited match reports</Text>
              <TouchableOpacity onPress={handleManageSubscription} activeOpacity={0.7} style={styles.manageBtn}>
                <Text style={styles.manageBtnText}>Manage subscription</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.planDetail}>{Math.min(reportCount, 3)} of 3 free reports used</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Paywall', { trigger: 'voluntary' })}
                style={styles.upgradeBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>Upgrade to Pro — £9.99/year</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {isSignedIn ? (
          <>
            {/* Stats card */}
            <View style={styles.card}>
              <Text style={styles.cardSectionLabel}>YOUR STATS</Text>
              <View style={styles.statsRow}>
                {/* Total analyses */}
                <View style={styles.statItem}>
                  {statsLoading
                    ? <Skel w={36} h={26} />
                    : <Text style={styles.statValue}>{stats.totalReports !== null ? String(stats.totalReports) : '—'}</Text>
                  }
                  {statsLoading
                    ? <Skel w={60} h={12} />
                    : <Text style={styles.statLabel}>Analyses</Text>
                  }
                </View>
                <View style={styles.statDivider} />
                {/* Grounds */}
                <View style={styles.statItem}>
                  {statsLoading
                    ? <Skel w={36} h={26} />
                    : <Text style={styles.statValue}>{stats.distinctGrounds !== null ? String(stats.distinctGrounds) : '—'}</Text>
                  }
                  {statsLoading
                    ? <Skel w={54} h={12} />
                    : <Text style={styles.statLabel}>Grounds</Text>
                  }
                </View>
                <View style={styles.statDivider} />
                {/* Reviews */}
                <View style={styles.statItem}>
                  {statsLoading
                    ? <Skel w={36} h={26} />
                    : <Text style={styles.statValue}>{stats.totalReviews !== null ? String(stats.totalReviews) : '—'}</Text>
                  }
                  {statsLoading
                    ? <Skel w={52} h={12} />
                    : <Text style={styles.statLabel}>Reviews</Text>
                  }
                </View>
              </View>
            </View>

            {/* Account section */}
            <View style={styles.card}>
              <Text style={styles.cardSectionLabel}>ACCOUNT</Text>
              <TouchableOpacity
                style={styles.listRow}
                onPress={handleRestorePurchases}
                activeOpacity={0.7}
              >
                <Text style={styles.listRowText}>Restore purchases</Text>
                <Text style={styles.listRowChevron}>›</Text>
              </TouchableOpacity>
              <View style={styles.listRowDivider} />
              <TouchableOpacity
                style={styles.listRow}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <Text style={[styles.listRowText, styles.signOutText]}>Sign out</Text>
                <Text style={styles.listRowChevron}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Anonymous state */
          <View style={styles.card}>
            <Text style={styles.signInPromptText}>
              Sign in to sync your history and subscription across devices
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={0.85}
            >
              <Text style={styles.signInBtnText}>Sign in / Create account</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },

  // ── Header ──────────────────────────────────────────────
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#104020',
  },
  backText: {
    fontSize: 22,
    color: '#FFFDF7',
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: 'rgba(247,242,232,0.80)',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(247,242,232,0.15)',
  },

  // ── Scroll content ──────────────────────────────────────
  content: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },

  // ── Avatar section ──────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#903020',
    overflow: 'hidden',
    marginBottom: 14,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarFallback: {
    backgroundColor: C.tan,
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarInitialText: {
    fontSize: 32,
    fontWeight: '700',
    color: C.cream,
    lineHeight: 38,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: C.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 13,
    color: C.mutedText,
    textAlign: 'center',
  },

  // ── Cards ───────────────────────────────────────────────
  card: {
    backgroundColor: C.cardFill,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.soilBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.tan,
    marginBottom: 14,
  },

  // ── Plan card ────────────────────────────────────────────
  planRow: {
    marginBottom: 8,
  },
  planBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  planBadgePro: {
    backgroundColor: C.proBg,
  },
  planBadgeFree: {
    backgroundColor: C.freeBg,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planBadgeTextPro: {
    color: C.proText,
  },
  planBadgeTextFree: {
    color: C.mutedText,
  },
  planDetail: {
    fontSize: 13,
    color: C.mutedText,
    marginTop: 4,
    marginBottom: 12,
  },
  upgradeBtn: {
    backgroundColor: C.red,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  manageBtn: {
    paddingVertical: 4,
  },
  manageBtnText: {
    fontSize: 12,
    color: C.mutedText,
    textDecorationLine: 'underline',
  },

  // ── Stats card ───────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: C.dark,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 11,
    color: C.mutedText,
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: C.divider,
  },

  // ── Account rows ─────────────────────────────────────────
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  listRowDivider: {
    height: 1,
    backgroundColor: C.divider,
  },
  listRowText: {
    fontSize: 15,
    color: C.dark,
    fontWeight: '500',
  },
  signOutText: {
    color: C.red,
  },
  listRowChevron: {
    fontSize: 20,
    color: C.mutedText,
    lineHeight: 24,
  },

  // ── Anonymous sign-in prompt ─────────────────────────────
  signInPromptText: {
    fontSize: 14,
    color: C.mutedText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  signInBtn: {
    backgroundColor: C.dark,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signInBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
  },
})
