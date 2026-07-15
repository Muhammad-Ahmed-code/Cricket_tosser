import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, {
  Circle,
  Defs,
  Filter,
  FeTurbulence,
  FeColorMatrix,
  Rect,
} from 'react-native-svg'
import {
  useFonts,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono'
import Coin from '../components/Coin'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const cricketFontSize = Math.min(70, SCREEN_WIDTH * 0.172)
const tosserFontSize  = Math.min(48, SCREEN_WIDTH * 0.118)

const LOAD_MS = 3400

const T = {
  bg:       '#f1ead8',
  spot:     '#fff5dd',
  ink:      '#1a0e0c',
  inkSoft:  'rgba(26,14,12,0.62)',
  inkLow:   'rgba(26,14,12,0.42)',
  inkFaint: 'rgba(26,14,12,0.16)',
  oxblood:  '#a8331f',
}

interface Props {
  onFinish: () => void
  onReady?: () => void
}

export default function SplashScreenView({ onFinish, onReady }: Props) {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) onReady?.()
  }, [fontsLoaded])

  const [pct, setPct] = useState(0)

  // Entrance
  const metaOpacity    = useRef(new Animated.Value(0)).current
  const metaTransY     = useRef(new Animated.Value(-8)).current
  const ruleOpacity    = useRef(new Animated.Value(0)).current
  const wordOpacity    = useRef(new Animated.Value(0)).current
  const wordTransY     = useRef(new Animated.Value(14)).current
  const loaderOpacity  = useRef(new Animated.Value(0)).current
  const loaderTransY   = useRef(new Animated.Value(14)).current

  // Post-landing reveal
  const haloOpacity    = useRef(new Animated.Value(0)).current

  // Full-screen fade-out
  const screenOpacity  = useRef(new Animated.Value(1)).current

  // Loader dot blink
  const dotOpacity     = useRef(new Animated.Value(1)).current

  // Progress bar — JS driver (width% can't use native driver)
  const progressAnim   = useRef(new Animated.Value(0)).current
  const progressWidth  = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })

  useEffect(() => {
    // Loader dot blink: 1.4s ease-in-out infinite
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1,   duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()

    // entered at 40ms: staggered fade + slide for meta (0ms), wordmark (150ms), loader (300ms)
    const tEnter = setTimeout(() => {
      Animated.parallel([
        Animated.timing(metaOpacity,   { toValue: 1, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(metaTransY,    { toValue: 0, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(ruleOpacity,   { toValue: 1, duration: 600, delay: 50,  easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(wordOpacity,   { toValue: 1, duration: 700, delay: 150, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(wordTransY,    { toValue: 0, duration: 700, delay: 150, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(loaderOpacity, { toValue: 1, duration: 700, delay: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(loaderTransY,  { toValue: 0, duration: 700, delay: 300, easing: Easing.ease, useNativeDriver: true }),
      ]).start()
    }, 40)

    // Loader ramp: +1% every LOAD_MS/100 ms
    const stepMs = LOAD_MS / 100
    let count = 0
    const iv = setInterval(() => {
      count = Math.min(100, count + 1)
      setPct(count)
      if (count >= 100) clearInterval(iv)
    }, stepMs)

    return () => {
      clearTimeout(tEnter)
      clearInterval(iv)
    }
  }, [])

  // Progress bar width (JS driver, smooth 80ms transitions)
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct, duration: 80, easing: Easing.linear, useNativeDriver: false,
    }).start()
  }, [pct])

  // pct=100 → +280ms fade out, +820ms navigate
  useEffect(() => {
    if (pct < 100) return
    const tFade = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 500, easing: Easing.ease, useNativeDriver: true,
      }).start()
    }, 280)
    const tNav = setTimeout(onFinish, 820)
    return () => { clearTimeout(tFade); clearTimeout(tNav) }
  }, [pct])

  const handleLanded = () => {
    Animated.timing(haloOpacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }).start()
  }

  if (!fontsLoaded) return <View style={styles.wait} />

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Background: linear approximation of radial-gradient(ellipse 80% 46% at 50% 40%) */}
      <LinearGradient
        colors={[T.spot, T.bg, '#e8e0cb']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Paper grain — decorative, no-op on platforms that don't support SVG filters */}
      <Svg
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 }}
        preserveAspectRatio="none"
      >
        <Defs>
          <Filter id="splashgrain">
            <FeTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="7" />
            <FeColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.16 0" />
          </Filter>
        </Defs>
        <Rect width="100%" height="100%" filter="url(#splashgrain)" />
      </Svg>

      {/* ── Masthead meta row — top 78, inset 28 ── */}
      <Animated.View style={[styles.masthead, { opacity: metaOpacity, transform: [{ translateY: metaTransY }] }]}>
        <Text style={[styles.metaText, { color: T.oxblood }]}>EST · 2026</Text>
        <Text style={[styles.metaText, { color: T.inkLow }]}>Pitch Oracle</Text>
        <Text style={[styles.metaText, { color: T.oxblood }]}>{'№'} 001</Text>
      </Animated.View>

      {/* Hairline rule at top 102 */}
      <Animated.View style={[styles.hairline, { opacity: ruleOpacity }]} />

      {/* ── Hero: 240×240 centered box at top 196 ── */}
      <View style={styles.heroOuter}>
        <View style={styles.heroInner}>

          {/* Halo rings — fade in after coin lands */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: haloOpacity }]}>
            <Svg width={240} height={240} viewBox="0 0 240 240">
              <Circle cx="120" cy="120" r="118" fill="none" stroke={T.inkFaint} strokeWidth="1" />
              <Circle cx="120" cy="120" r="100" fill="none"
                stroke="rgba(168,51,31,0.18)" strokeWidth="1" strokeDasharray="2 6" />
            </Svg>
          </Animated.View>

          {/* Coin: 206px centered in 240px box → offset (240-206)/2 = 17 */}
          <View style={styles.coinPos}>
            <Coin size={206} onLanded={handleLanded} />
          </View>

        </View>
      </View>

      {/* ── Wordmark + tagline at top 472 ── */}
      <Animated.View style={[styles.wordmark, { opacity: wordOpacity, transform: [{ translateY: wordTransY }] }]}>
        <Text style={styles.wordmarkCricket}>Cricket</Text>
        <Text style={styles.wordmarkTosser}>Tosser</Text>
        <Text style={styles.tagline}>Read the pitch before the bowler does.</Text>
      </Animated.View>

      {/* ── Loader at bottom 88 ── */}
      <Animated.View style={[styles.loader, { opacity: loaderOpacity, transform: [{ translateY: loaderTransY }] }]}>
        <View style={styles.loaderHeader}>
          <View style={styles.loaderLabelRow}>
            <Animated.View style={[styles.loaderDot, { opacity: dotOpacity }]} />
            <Text style={styles.loaderLabel}>Reading the pitch</Text>
          </View>
          <Text style={styles.loaderPct}>{pct}%</Text>
        </View>
        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderFill, { width: progressWidth }]}>
            <LinearGradient
              colors={[T.oxblood, '#d97a4a']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wait: { flex: 1, backgroundColor: '#f1ead8' },
  root: { flex: 1, overflow: 'hidden' },

  masthead: {
    position: 'absolute', top: 78, left: 28, right: 28,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 5,
  },
  metaText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10, letterSpacing: 2.6, textTransform: 'uppercase',
  },

  hairline: {
    position: 'absolute', top: 102, left: 28, right: 28,
    height: StyleSheet.hairlineWidth, backgroundColor: T.inkFaint, zIndex: 5,
  },

  heroOuter: {
    position: 'absolute', top: 196, left: 0, right: 0,
    alignItems: 'center', zIndex: 6,
  },
  heroInner: { width: 240, height: 240 },

  coinPos: { position: 'absolute', top: 17, left: 17 },

  wordmark: {
    position: 'absolute', top: 472, left: 28, right: 28,
    alignItems: 'center', zIndex: 6,
    paddingHorizontal: 24,
  },
  wordmarkCricket: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: cricketFontSize,
    lineHeight: Math.round(cricketFontSize * 1.05),
    letterSpacing: -2.5,
    color: T.ink,
    textAlign: 'center',
  },
  wordmarkTosser: {
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: tosserFontSize,
    lineHeight: Math.round(tosserFontSize * 1.35),
    letterSpacing: 0,
    color: T.oxblood,
    textAlign: 'center',
    transform: [{ skewX: '-12deg' }],
  },
  tagline: {
    marginTop: 16,
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: 16, lineHeight: 22,
    color: T.inkSoft, textAlign: 'center', maxWidth: 260,
  },

  loader: {
    position: 'absolute', bottom: 88, left: 28, right: 28, zIndex: 7,
  },
  loaderHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  loaderLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  loaderDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: T.oxblood,
  },
  loaderLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: T.inkLow,
  },
  loaderPct: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12, color: T.ink,
  },
  loaderTrack: {
    height: 3, borderRadius: 2, backgroundColor: T.inkFaint, overflow: 'hidden',
  },
  loaderFill: {
    height: '100%', overflow: 'hidden',
  },
})
