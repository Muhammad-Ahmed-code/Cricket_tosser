import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { usePurchases } from '../lib/usePurchases'

const C = {
  cream: '#F1EAD8',
  dark: '#1A0E0C',
  red: '#A8331F',
  tan: '#C2A172',
  mutedText: 'rgba(26,14,12,0.62)',
  dimText: 'rgba(26,14,12,0.40)',
  veryMuted: 'rgba(26,14,12,0.18)',
  cardFill: '#FFF8E8',
  divider: 'rgba(26,14,12,0.10)',
  white: '#FFFFFF',
  green: '#2E6B1F',
  greenBg: '#DFF0D2',
}

const FEATURES = [
  'Unlimited match reports',
  'Live weather analysis',
  'AI squad recommendations',
]

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>

export default function PaywallScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false)
  const { isSignedIn } = useAuth()
  const { purchaseYearlyPlan, restorePurchases } = usePurchases()

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const success = await purchaseYearlyPlan()
      if (success) {
        if (!isSignedIn) {
          // Anonymous purchase — nudge them to create an account so it follows them
          Alert.alert(
            'Keep your subscription across devices',
            'Create an account to access your subscription on any device.',
            [
              { text: 'Maybe later', style: 'cancel', onPress: () => navigation.replace('Home') },
              { text: 'Create account', onPress: () => navigation.replace('Auth') },
            ]
          )
        } else {
          navigation.replace('Home')
          Alert.alert("You're all set!", 'Enjoy unlimited reports.')
        }
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
    if (!isSignedIn) {
      Alert.alert(
        'Sign in first',
        'Sign in so we can find and restore your subscription across devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => navigation.replace('Auth') },
        ]
      )
      return
    }

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

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Image
            source={require('../../assets/cricket-ball.png')}
            style={styles.ballIcon}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.headline}>{"You've used your\n3 free reports"}</Text>
        <Text style={styles.subheadline}>
          {"Unlock unlimited pitch analysis\nfor the whole season"}
        </Text>

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
        <TouchableOpacity
          style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.ctaBtnText}>Start for £3.99 / year</Text>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },

  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtnText: { fontSize: 14, color: C.red, fontWeight: '600' },

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
    fontSize: 30,
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
    borderRadius: 14,
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
  ctaBtn: {
    backgroundColor: C.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  ctaBtnDisabled: { opacity: 0.65 },
  ctaBtnText: { color: C.white, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  restoreBtn: { paddingVertical: 8 },
  restoreBtnText: { fontSize: 13, color: C.red, fontWeight: '500' },

  legal: {
    fontSize: 10,
    color: C.dimText,
    textAlign: 'center',
    lineHeight: 15,
  },
})
