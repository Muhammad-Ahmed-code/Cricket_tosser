import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: W, height: H } = Dimensions.get('screen')

const C = {
  bg:      '#07030A',
  glow:    '#2A1410',
  cream:   '#F5EAD0',
  red:     '#D94B3A',
  c55:     'rgba(245,234,208,0.55)',
  c70:     'rgba(245,234,208,0.70)',
  c15:     'rgba(245,234,208,0.15)',
  c08:     'rgba(245,234,208,0.08)',
}

// Ball positioning extracted from the HTML design (reference: 390×844)
// Container: top 354, left 130, size 320. Image overflows -38.39 on all sides → 396.78px
// Effective screen position: top 315.61, left 91.61, size 396.781
// Rotation: matrix(0.951, -0.309, 0.309, 0.951) = 18° around image centre
const BALL_SIZE = W * (396.781 / 390)
const BALL_TOP  = H * (315.61 / 844)
const BALL_LEFT = W * (91.61 / 390)

interface Props {
  onFinish: () => void
}

export default function SplashScreenView({ onFinish }: Props) {
  const fade     = useRef(new Animated.Value(1)).current
  const progress = useRef(new Animated.Value(0)).current
  const insets   = useSafeAreaInsets()

  const progressWidth = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, W],
  })

  useEffect(() => {
    Animated.sequence([
      // Progress bar fills over exactly 2.5 s (linear, JS driver — width not native-animatable)
      Animated.timing(progress, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      // Fade the whole screen out once the bar reaches the end
      Animated.timing(fade, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish())
  }, [])

  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 20)

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Radial glow — dark maroon ellipse behind the ball */}
      <View style={styles.glow} />

      {/* Vertical divider line */}
      <View style={[styles.vline, { left: W * 0.42 }]} />

      {/* ── TOP BAR ── */}
      <View style={[styles.topBar, { top: topPad + 8 }]}>
        <Text style={styles.labelSmall}>EST · 2026 / VOL.01</Text>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* ── TITLE BLOCK ── */}
      <View style={[styles.titleBlock, { top: topPad + 52 }]}>
        <Text style={styles.titleMain}>Cricket</Text>
        <Text style={styles.titleAccent}>Tosser</Text>
        <Text style={styles.subtitle}>
          Read the pitch before{'\n'}the bowler does.
        </Text>
      </View>

      {/* ── CRICKET BALL ── exact position/size/rotation from HTML */}
      <Image
        source={require('../../assets/cinematic-ball.png')}
        style={[
          styles.ball,
          {
            width:  BALL_SIZE,
            height: BALL_SIZE,
            top:    BALL_TOP,
            left:   BALL_LEFT,
            transform: [{ rotate: '18deg' }],
          },
        ]}
        resizeMode="contain"
      />

      {/* ── BOTTOM DATA BAR ── */}
      <View style={[styles.dataBar, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
        {/* top separator */}
        <View style={styles.sep} />
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>SEAM · 73°</Text>
          <Text style={styles.dataLabel}>HARDNESS · 8.2</Text>
          <Text style={styles.dataLabel}>SPIN · LOW</Text>
        </View>
        {/* progress line — animates 0 → full width, red → white gradient */}
        <Animated.View style={[styles.progressLine, { width: progressWidth }]}>
          <LinearGradient
            colors={['#cc2200', '#ff4422', '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    overflow: 'hidden',
  },

  glow: {
    position: 'absolute',
    width:  W * 0.75,
    height: H * 0.55,
    borderRadius: W * 0.375,
    backgroundColor: C.glow,
    opacity: 0.45,
    top:  H * 0.30,
    left: W * 0.12,
  },

  vline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: C.c15,
  },

  // ── top bar ──────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  labelSmall: {
    color: C.c55,
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 3.08,
    textTransform: 'uppercase',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.red,
  },
  liveText: {
    color: C.red,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3.08,
    textTransform: 'uppercase',
  },

  // ── title ─────────────────────────────────────────────────────────────────
  titleBlock: {
    position: 'absolute',
    left: 28,
    zIndex: 20,
  },
  titleMain: {
    color: C.cream,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2.24,
    lineHeight: 62,
  },
  titleAccent: {
    color: C.red,
    fontSize: 56,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: -2.24,
    lineHeight: 62,
  },
  subtitle: {
    color: C.c70,
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 21,
    marginTop: 14,
  },

  // ── ball ──────────────────────────────────────────────────────────────────
  ball: {
    position: 'absolute',
    zIndex: 5,
    overflow: 'visible',
  },

  // ── data bar ──────────────────────────────────────────────────────────────
  dataBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    zIndex: 20,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.c15,
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    color: C.c55,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  progressLine: {
    marginTop: 10,
    height: 2,
    overflow: 'hidden',
    borderRadius: 1,
  },
})
