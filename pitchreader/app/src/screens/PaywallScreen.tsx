import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { usePurchases } from '../lib/usePurchases'
import { usageStore } from '../lib/usageStore'
import { track } from '../lib/analytics'

const C = {
  cream:     '#F7F2E8',
  dark:      '#104020',
  red:       '#903020',
  tan:       '#507020',
  mutedText: '#52624A',
  dimText:   'rgba(82,98,74,0.55)',
  veryMuted: 'rgba(208,212,197,0.55)',
  cardFill:  '#FFFDF7',
  divider:   'rgba(208,212,197,0.60)',
  white:     '#FFFDF7',
  green:     '#507020',
  greenBg:   '#E8F2DC',
}

const FEATURES = [
  'Unlimited match reports',
  'Live weather analysis',
  'Cricket Tosser squad recommendations',
]

const COPY = {
  limit_reached: {
    title: "You've used your 3 free reports",
    subtitle: "Upgrade to Cricket Tosser Pro to keep analysing pitches all season.",
  },
  voluntary: {
    title: "Upgrade to Cricket Tosser Pro",
    subtitle: "Unlimited pitch reports, all season long. Never miss a toss.",
  },
  restore: {
    title: "Welcome back",
    subtitle: "Restore your Pro subscription below.",
  },
}

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>

export default function PaywallScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoStatus, setPromoStatus] = useState<'idle' | 'applied' | 'invalid' | 'already_applied'>('idle')
  const scrollViewRef = useRef<ScrollView>(null)
  const { isSignedIn } = useAuth()
  const { purchaseYearlyPlan, restorePurchases } = usePurchases()

  const trigger = route.params?.trigger ?? 'voluntary'
  const copy = COPY[trigger]

  useEffect(() => {
    track('paywall_shown', { reports_used: usageStore.getReportCount(), trigger })
  }, [])

  const handleApplyPromo = () => {
    if (promoStatus === 'applied') {
      setPromoStatus('already_applied')
      return
    }
    if (promoCode.trim().toUpperCase() === 'HITFORSIX') {
      setPromoStatus('applied')
      setPromoCode('')
    } else {
      setPromoStatus('invalid')
    }
  }

  const handlePurchase = async () => {
    setLoading(true)
    try {
      // NOTE: when promoStatus === 'applied', this should use the $6.99 discounted
      // RevenueCat package/offering if one exists. Map promoStatus here once the
      // discounted offering is configured in RevenueCat.
      const success = await purchaseYearlyPlan()
      if (success) {
        navigation.replace('Home')
        Alert.alert("You're all set!", 'Enjoy unlimited reports.')
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'userCancelled' in err && (err as { userCancelled: boolean }).userCancelled) {
        return
      }
      const message = err instanceof Error ? err.message : 'Purchase failed. Please try again.'
      Alert.alert('Purchase failed', message)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    setLoading(true)
    try {
      const success = await restorePurchases()
      if (success) {
        navigation.replace('Home')
        Alert.alert('Purchases restored!', 'Your subscription is active.')
      } else {
        Alert.alert(
          'No subscription found',
          "We couldn't find an active subscription to restore."
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restore failed. Please try again.'
      Alert.alert('Restore failed', message)
    } finally {
      setLoading(false)
    }
  }

  // Auth gate — anonymous users must sign in before any purchase UI is shown
  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.authGate}>
          <View style={styles.iconWrap}>
            <Image
              source={require('../../assets/coin-emblem.png')}
              style={styles.ballIcon}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.authGateTitle}>Create a free account first</Text>
          <Text style={styles.authGateBody}>
            Sign in to Cricket Tosser before upgrading — this links your subscription to your
            account so it's never lost and works across all your devices.
          </Text>

          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Sign in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.restoreBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        disabled={loading}
      >
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Image
            source={require('../../assets/coin-emblem.png')}
            style={styles.ballIcon}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.headline}>{copy.title}</Text>
        <Text style={styles.subheadline}>{copy.subtitle}</Text>

        <View style={styles.featureList}>
          {FEATURES.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.priceNote}>Less than a round of drinks for a full season</Text>
      </View>

      <View style={styles.actions}>
        {/* Promo code */}
        <View style={styles.promoSection}>
          <Text style={styles.promoLabel}>Have a promo code?</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              value={promoCode}
              onChangeText={text => {
                setPromoCode(text)
                if (promoStatus === 'invalid' || promoStatus === 'already_applied') {
                  setPromoStatus('idle')
                }
              }}
              placeholder="Enter code e.g. HITFORSIX"
              placeholderTextColor={C.dimText}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={promoStatus !== 'applied'}
              onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            />
            <TouchableOpacity
              style={[styles.promoApplyBtn, promoStatus === 'applied' && styles.promoApplyBtnDisabled]}
              onPress={handleApplyPromo}
              activeOpacity={0.8}
              disabled={promoStatus === 'applied'}
            >
              <Text style={styles.promoApplyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {promoStatus === 'invalid' && (
            <Text style={styles.promoError}>Invalid promo code</Text>
          )}
          {promoStatus === 'already_applied' && (
            <Text style={styles.promoSuccess}>Code already applied ✓</Text>
          )}
          {promoStatus === 'applied' && (
            <Text style={styles.promoSuccess}>Promo applied 🏏</Text>
          )}
        </View>

        {/* Price display */}
        <View style={styles.priceRow}>
          {promoStatus === 'applied' ? (
            <>
              <Text style={styles.priceStrike}>£9.99/year</Text>
              <Text style={styles.priceDiscounted}> £6.99/year</Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.ctaBtnText}>
              {promoStatus === 'applied' ? 'Start for £6.99 / year' : 'Start for £9.99 / year'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.restoreBtnText}>Restore purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Billed annually. Cancel anytime via App Store or Google Play.
        </Text>
      </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  scrollContent: { flexGrow: 1 },

  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtnText: { fontSize: 14, color: C.dark, fontWeight: '600' },

  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  authGateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.dark,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  authGateBody: {
    fontSize: 14,
    color: C.mutedText,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 32,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 8,
  },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  ballIcon: { width: 80, height: 80, borderRadius: 40 },

  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: C.dark,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 15,
    color: C.mutedText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  featureList: {
    alignSelf: 'stretch',
    backgroundColor: C.cardFill,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.divider,
    marginBottom: 20,
    gap: 14,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: C.white, fontSize: 12, fontWeight: '700' },
  featureText: { fontSize: 15, color: C.dark, fontWeight: '500', flex: 1 },

  priceNote: {
    fontSize: 12,
    color: C.dimText,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  actions: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 10,
  },

  promoSection: {
    alignSelf: 'stretch',
    gap: 6,
  },
  promoLabel: {
    fontSize: 12,
    color: C.mutedText,
    fontWeight: '500',
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.divider,
    backgroundColor: C.cardFill,
    paddingHorizontal: 12,
    fontSize: 14,
    color: C.dark,
    letterSpacing: 0.5,
  },
  promoApplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.dark,
  },
  promoApplyBtnDisabled: {
    opacity: 0.4,
  },
  promoApplyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
  },
  promoError: {
    fontSize: 12,
    color: C.red,
    fontWeight: '500',
  },
  promoSuccess: {
    fontSize: 12,
    color: C.green,
    fontWeight: '600',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 18,
  },
  priceStrike: {
    fontSize: 14,
    color: C.dimText,
    textDecorationLine: 'line-through',
  },
  priceDiscounted: {
    fontSize: 15,
    color: C.green,
    fontWeight: '700',
  },

  ctaBtn: {
    backgroundColor: C.red,
    borderRadius: 16,
    paddingVertical: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  ctaBtnDisabled: { opacity: 0.65 },
  ctaBtnText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  restoreBtn: { paddingVertical: 8 },
  restoreBtnText: { fontSize: 13, color: C.mutedText, fontWeight: '500' },

  legal: {
    fontSize: 10,
    color: C.dimText,
    textAlign: 'center',
    lineHeight: 15,
  },
})
