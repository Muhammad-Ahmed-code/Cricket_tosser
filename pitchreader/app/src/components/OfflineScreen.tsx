import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'
import Svg, { Circle, Line, Path, G } from 'react-native-svg'
import { theme } from '../theme'

interface Props {
  onBackOnline: () => void
  onViewHistory: () => void
}

export default function OfflineScreen({ onBackOnline, onViewHistory }: Props) {
  const [checking, setChecking] = useState(false)
  const shakeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start()
  }, [slideAnim])

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start()
  }

  const handleTryAgain = async () => {
    if (checking) return
    setChecking(true)
    await new Promise<void>(r => setTimeout(r, 1500))
    const state = await NetInfo.fetch()
    setChecking(false)
    if (state.isConnected && state.isInternetReachable !== false) {
      onBackOnline()
    } else {
      shake()
    }
  }

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.root, { transform: [{ translateY: slideAnim }] }]}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <CoinNoSignal />
          <Text style={styles.title}>You're offline</Text>
          <Text style={styles.subtitle}>
            Cricket Tosser needs a connection to analyse pitches and sync your reports. Your saved history is still available.
          </Text>
          <Animated.View style={[styles.btnWrapper, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleTryAgain}
              activeOpacity={0.85}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color={theme.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Try again</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity onPress={onViewHistory} activeOpacity={0.7} style={styles.historyLink}>
            <Text style={styles.historyLinkText}>View report history →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  )
}

function CoinNoSignal() {
  return (
    <View style={styles.coinContainer}>
      <Image
        source={require('../../assets/images/app-icon.png')}
        style={styles.coinImage}
        resizeMode="contain"
      />
      <View style={styles.badge}>
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={18} fill="#a8331f" />
          <G transform="translate(18, 18)">
            <Path
              d="M -8 -4 A 10 10 0 0 1 8 -4"
              stroke="white"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M -5 2 A 6 6 0 0 1 5 2"
              stroke="white"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Circle cx={0} cy={7} r={1.5} fill="white" />
            <Line
              x1={-10}
              y1={-11}
              x2={10}
              y2={11}
              stroke="white"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    backgroundColor: theme.cream,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  coinContainer: {
    width: 120,
    height: 120,
    marginBottom: 28,
    position: 'relative',
  },
  coinImage: {
    width: 120,
    height: 120,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  btnWrapper: {
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radiusMd,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: theme.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  historyLink: {
    paddingVertical: 8,
  },
  historyLinkText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
})
