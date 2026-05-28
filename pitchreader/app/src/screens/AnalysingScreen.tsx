import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native'
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  Circle,
  Line,
  G,
  Path,
} from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { analysePitch } from '../lib/api'

const { width: SW } = Dimensions.get('window')

const C = {
  cream:     '#F1EAD8',
  dark:      '#1A0E0C',
  red:       '#A8331F',
  tan:       '#C2A172',
  mutedText: 'rgba(26,14,12,0.55)',
  dimText:   'rgba(26,14,12,0.35)',
  veryMuted: 'rgba(26,14,12,0.18)',
  divider:   'rgba(26,14,12,0.08)',
  gridLine:  'rgba(26,14,12,0.05)',
}

// Animated version of react-native-svg G element for the sweep arm
const AnimatedG = Animated.createAnimatedComponent(G)

type Props = NativeStackScreenProps<RootStackParamList, 'Analysing'>
type StepState = 'waiting' | 'active' | 'done'

const SVG_SIZE  = 260
const RADAR_H   = 300
const RING_SIZE = 186   // dashed ring diameter ≈ r=35 inner ring in SVG coords
const BALL_SIZE = Math.round(RING_SIZE * 0.65)  // 121px — 65% of ring diameter

const STEPS = [
  { title: 'Decoding photos',             sub: '4 / 4 INGESTED' },
  { title: 'Mapping surface texture',     sub: 'GRAIN · DENSITY · SHEEN' },
  { title: 'Detecting cracks · moisture', sub: 'HIGH-PASS · SATURATION' },
  { title: 'Comparing ends · A vs B',    sub: 'DIFFERENTIAL WEAR' },
  { title: 'Pulling live weather',        sub: 'TEMP · DEW · WIND' },
  { title: 'Generating match read',       sub: 'FORECAST · 1ST · 2ND INN' },
]

export default function AnalysingScreen({ route, navigation }: Props) {
  const { photos, groundName, overs, lat, lng, squad } = route.params

  const [stepStates, setStepStates] = useState<StepState[]>([
    'active', 'waiting', 'waiting', 'waiting', 'waiting', 'waiting',
  ])
  const [step5Sub, setStep5Sub]     = useState('TEMP · DEW · WIND')
  const [weatherPct, setWeatherPct] = useState(0)
  const [error, setError]           = useState<string | null>(null)
  const [radarValues, setRadarValues] = useState({
    seam: '70°', moisture: '—%', cracks: '0.25', dewPt: '—°C',
  })

  // Animations
  const ballAnim     = useRef(new Animated.Value(0)).current  // ball spins 7s (native)
  const sweepAnim    = useRef(new Animated.Value(0)).current  // sweep rotates 2.4s (JS driver)
  const pulseAnim    = useRef(new Animated.Value(1)).current  // active step pulse
  const progressAnim = useRef(new Animated.Value(0)).current  // progress bar
  const rotation     = useRef(new Animated.Value(0)).current  // dashed ring slow rotation (native)

  // Header step counter
  const activeIdx   = stepStates.findIndex(s => s === 'active')
  const currentStep = activeIdx >= 0 ? activeIdx + 1 : stepStates.filter(s => s === 'done').length
  const stepNum     = String(currentStep).padStart(2, '0')

  useEffect(() => {
    // Ball spins 360° every 7 seconds — native driver (transform on Animated.View)
    Animated.loop(
      Animated.timing(ballAnim, { toValue: 1, duration: 7000, useNativeDriver: true })
    ).start()

    // Dashed ring rotates 360° every 8 seconds — native driver
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start()

    // Sweep arm rotates 360° every 2.4 seconds — JS driver (SVG string prop)
    Animated.loop(
      Animated.timing(sweepAnim, { toValue: 1, duration: 2400, useNativeDriver: false })
    ).start()

    // Active step breathe pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start()

    // Progress bar → 85% over 12s
    Animated.timing(progressAnim, { toValue: 0.85, duration: 12000, useNativeDriver: false }).start()

    // Simulated surface-analysis steps
    const t1 = setTimeout(() => setStepStates(['done', 'active', 'waiting', 'waiting', 'waiting', 'waiting']), 300)
    const t2 = setTimeout(() => setStepStates(['done', 'done', 'active', 'waiting', 'waiting', 'waiting']), 750)
    const t3 = setTimeout(() => setStepStates(['done', 'done', 'done', 'active', 'waiting', 'waiting']), 1200)
    const t4 = setTimeout(() => setStepStates(['done', 'done', 'done', 'done', 'active', 'waiting']), 1700)

    // Fake weather-fetch percentage for step 5
    let pct = 0
    const pctInterval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 5 + 1, 95)
      setWeatherPct(Math.floor(pct))
    }, 350)

    ;(async () => {
      try {
        const result = await analysePitch({ imageBase64Array: photos, lat, lng, groundName, overs, squad })

        clearInterval(pctInterval)
        setWeatherPct(100)

        const weather    = result?.weather ?? {}
        const conditions = weather?.conditions ?? weather?.description ?? result?.conditions ?? ''
        const humidity   = weather?.humidity_percent
        const dewTemp    = weather?.forecast_afternoon_temp ?? weather?.dew_point

        const cl = conditions.toLowerCase()
        let seamVal = '70°'
        if (cl.includes('wet') || cl.includes('rain') || cl.includes('shower')) seamVal = '85°'
        else if (cl.includes('damp')) seamVal = '70°'
        else if (cl.includes('dry') || cl.includes('hard')) seamVal = '45°'

        const rain7 = weather?.rain_last_7days_mm ?? weather?.rain_last_7days ?? weather?.precipitation_7d ?? null
        let cracksVal = '0.25'
        if (rain7 !== null) cracksVal = rain7 > 10 ? '0.1' : rain7 > 3 ? '0.25' : '0.8'

        setRadarValues({
          seam:     seamVal,
          moisture: humidity != null ? `${Math.round(humidity)}%` : '—%',
          cracks:   cracksVal,
          dewPt:    dewTemp != null ? `${Math.round(dewTemp)}°C` : '—°C',
        })

        if (conditions) setStep5Sub(`${groundName.toUpperCase()} · ${conditions.toUpperCase()}`)
        else            setStep5Sub(groundName.toUpperCase())

        setStepStates(['done', 'done', 'done', 'done', 'done', 'active'])
        Animated.timing(progressAnim, { toValue: 1, duration: 700, useNativeDriver: false }).start()

        setTimeout(() => navigation.navigate('Report', { result, groundName, overs, squad }), 900)
      } catch (err) {
        clearInterval(pctInterval)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })()

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
      clearInterval(pctInterval)
    }
  }, [])

  // Ball rotation — native driver
  const ballRotate = ballAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  // Dashed ring rotation — native driver
  const rotateInterpolation = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  // Sweep arm — JS driver, SVG transform string
  const sweepTransform = sweepAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rotate(0 50 50)', 'rotate(360 50 50)'],
  })

  const progressPct = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })

  if (error) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const stepSubs = [STEPS[0].sub, STEPS[1].sub, STEPS[2].sub, STEPS[3].sub, step5Sub, STEPS[5].sub]

  return (
    <View style={styles.root}>
      {/* Subtle horizontal grid lines */}
      {Array.from({ length: 16 }).map((_, i) => (
        <View key={i} style={[styles.gridLine, { top: 44 + i * 52 }]} />
      ))}

      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <View style={styles.redDot} />
            <Text style={styles.analyzingText}>ANALYZING</Text>
          </View>
          <Text style={styles.stepCounter}>STEP {stepNum} / 06</Text>
        </View>
        <View style={styles.headerDivider} />

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroTop}>Reading the</Text>
          <Text style={styles.heroBottom}>pitch report.</Text>
        </View>

        {/* ── Radar section ── */}
        <View style={styles.radar}>

          {/* Crosshair lines through ball center */}
          <View style={styles.crossH} />
          <View style={styles.crossV} />

          {/* Cricket ball — spins 7s, clipped circular, BEHIND SVG */}
          <Animated.View style={[styles.ballWrap, { transform: [{ rotate: ballRotate }] }]}>
            <Image
              source={require('../../assets/cricket-ball.png')}
              style={{ width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE / 2 }}
              resizeMode="cover"
            />
          </Animated.View>

          {/* SVG radar overlay — exact copy from Analyzing.html */}
          <Svg
            width={SVG_SIZE}
            height={SVG_SIZE}
            viewBox="0 0 100 100"
            style={styles.svgOverlay}
          >
            <Defs>
              {/* Sweep arm gradient: transparent → red */}
              <SvgLinearGradient id="as_sweep" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%"   stopColor="#a8331f" stopOpacity={0}    />
                <Stop offset="80%"  stopColor="#a8331f" stopOpacity={0.55} />
                <Stop offset="100%" stopColor="#a8331f" stopOpacity={0.9}  />
              </SvgLinearGradient>

              {/* Radial glow: transparent core → soft red edge */}
              <SvgRadialGradient id="as_glow" cx="50%" cy="50%" r="50%">
                <Stop offset="60%"  stopColor="rgba(217,75,58,0)"    />
                <Stop offset="100%" stopColor="rgba(217,75,58,0.18)" />
              </SvgRadialGradient>
            </Defs>

            {/* Outer solid ring r=48 */}
            <Circle cx="50" cy="50" r={48} fill="none" stroke="rgba(26,14,12,0.18)" strokeWidth={0.3} />

            {/* Middle dashed ring r=42 — exact stroke-dasharray from HTML */}
            <Circle cx="50" cy="50" r={42} fill="none" stroke="rgba(26,14,12,0.18)" strokeWidth={0.3} strokeDasharray="0.6 1.4" />

            {/* Inner solid ring r=35 */}
            <Circle cx="50" cy="50" r={35} fill="none" stroke="rgba(26,14,12,0.18)" strokeWidth={0.25} />

            {/* Cardinal tick marks — 4 short lines at N/E/S/W */}
            <Line x1="50" y1="2" x2="50" y2="6" stroke="#1a0e0c" strokeOpacity={0.4} strokeWidth={0.5} />
            <Line x1="50" y1="2" x2="50" y2="6" stroke="#1a0e0c" strokeOpacity={0.4} strokeWidth={0.5} transform="rotate(90 50 50)"  />
            <Line x1="50" y1="2" x2="50" y2="6" stroke="#1a0e0c" strokeOpacity={0.4} strokeWidth={0.5} transform="rotate(180 50 50)" />
            <Line x1="50" y1="2" x2="50" y2="6" stroke="#1a0e0c" strokeOpacity={0.4} strokeWidth={0.5} transform="rotate(270 50 50)" />

            {/* Radial edge glow */}
            <Circle cx="50" cy="50" r={49} fill="url(#as_glow)" />

            {/* Sweep arm — rotates 360° every 2.4s */}
            <AnimatedG transform={sweepTransform}>
              <Path
                d="M50 50 L50 2 A48 48 0 0 1 91 26 Z"
                fill="url(#as_sweep)"
                opacity={0.75}
              />
            </AnimatedG>
          </Svg>

          {/* Dashed ring — rotates 8s around the ball */}
          <Animated.View style={[styles.ringWrap, { transform: [{ rotate: rotateInterpolation }] }]}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_SIZE / 2 - 2}
                fill="none"
                stroke="#c0392b"
                strokeWidth="1"
                strokeDasharray="4 8"
                opacity={0.4}
              />
            </Svg>
          </Animated.View>

          {/* Data point labels — four compass corners */}
          <View style={[styles.dataPoint, styles.dataTL]}>
            <Text style={styles.dataLabel}>SEAM</Text>
            <Text style={styles.dataValue}>{radarValues.seam}</Text>
          </View>
          <View style={[styles.dataPoint, styles.dataTR]}>
            <Text style={[styles.dataLabel, styles.dataRight]}>MOISTURE</Text>
            <Text style={[styles.dataValue, styles.dataRight]}>{radarValues.moisture}</Text>
          </View>
          <View style={[styles.dataPoint, styles.dataBL]}>
            <Text style={styles.dataLabel}>CRACKS</Text>
            <Text style={styles.dataValue}>{radarValues.cracks}</Text>
          </View>
          <View style={[styles.dataPoint, styles.dataBR]}>
            <Text style={[styles.dataLabel, styles.dataRight]}>DEW · PT</Text>
            <Text style={[styles.dataValue, styles.dataRight]}>{radarValues.dewPt}</Text>
          </View>
        </View>

        {/* ── Analysis steps ── */}
        <View style={styles.stepsList}>
          {STEPS.map((step, i) => {
            const state    = stepStates[i]
            const isDone   = state === 'done'
            const isActive = state === 'active'

            const rightLabel = isDone
              ? 'OK'
              : isActive && i === 4
                ? `${weatherPct}%`
                : isActive
                  ? '..'
                  : ''

            return (
              <Animated.View
                key={i}
                style={[styles.stepRow, isActive && { opacity: pulseAnim }]}
              >
                <View style={[
                  styles.circle,
                  isDone   ? styles.circleDone   :
                  isActive ? styles.circleActive  :
                             styles.circleWaiting,
                ]}>
                  {isDone   && <Text style={styles.tick}>✓</Text>}
                  {isActive && <View style={styles.activeDot} />}
                </View>

                <View style={styles.stepBody}>
                  <Text style={[styles.stepTitle, !(isDone || isActive) && styles.stepTitleMuted]}>
                    {step.title}
                  </Text>
                  <Text style={styles.stepSub}>{stepSubs[i]}</Text>
                </View>

                <Text style={[styles.stepRight, isDone && styles.stepRightDone]}>
                  {rightLabel}
                </Text>
              </Animated.View>
            )
          })}
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressPct }]}>
            <LinearGradient
              colors={[C.red, '#D44C3A', '#E8BF8C', C.cream]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

      </SafeAreaView>
    </View>
  )
}

const SVG_TOP  = (RADAR_H - SVG_SIZE) / 2

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  safe: { flex: 1 },

  // Error
  errorRoot: {
    flex: 1, backgroundColor: C.cream,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  errorText:    { color: C.red, fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryBtn:     { backgroundColor: C.dark, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Grid
  gridLine: {
    position: 'absolute', left: 0, right: 0,
    height: 1, backgroundColor: C.gridLine,
  },

  // Header
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  redDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  analyzingText: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: C.red },
  stepCounter:   { fontSize: 10, fontWeight: '600', letterSpacing: 2, color: C.mutedText },
  headerDivider: { height: 1, backgroundColor: C.divider, marginHorizontal: 16 },

  // Hero
  hero: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  heroTop: {
    fontSize: 38, fontWeight: '800', color: C.dark, lineHeight: 44,
  },
  heroBottom: {
    fontSize: 38, fontWeight: '700', fontStyle: 'italic',
    color: C.red, lineHeight: 44, letterSpacing: -1, marginTop: -4,
  },

  // Radar section
  radar: {
    width: SW, height: RADAR_H,
    alignSelf: 'center', position: 'relative',
  },
  crossH: {
    position: 'absolute',
    top: (RADAR_H - 0.5) / 2,
    alignSelf: 'center',
    width: RING_SIZE,
    height: 0.5,
    backgroundColor: '#8B1A1A',
    opacity: 0.2,
  },
  crossV: {
    position: 'absolute',
    top: (RADAR_H - RING_SIZE) / 2,
    alignSelf: 'center',
    width: 0.5,
    height: RING_SIZE,
    backgroundColor: '#8B1A1A',
    opacity: 0.2,
  },
  // Ball — circular clipped, spins behind SVG
  ballWrap: {
    position: 'absolute',
    top: (RADAR_H - BALL_SIZE) / 2,
    alignSelf: 'center',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    overflow: 'hidden',
  },
  // Dashed rotating ring — sits just outside the ball
  ringWrap: {
    position: 'absolute',
    top: (RADAR_H - RING_SIZE) / 2,
    alignSelf: 'center',
  },
  // SVG overlay — on top of ball
  svgOverlay: {
    position: 'absolute',
    top: SVG_TOP,
    alignSelf: 'center',
  },

  // Data labels
  dataPoint: { position: 'absolute' },
  dataTL: { top: 42, left: 16 },
  dataTR: { top: 42, right: 16 },
  dataBL: { bottom: 42, left: 16 },
  dataBR: { bottom: 42, right: 16 },
  dataLabel: {
    fontSize: 8, fontWeight: '700', letterSpacing: 2,
    color: C.red, marginBottom: 3,
  },
  dataRight:  { textAlign: 'right' },
  dataValue: {
    fontSize: 26, fontWeight: '800', color: C.dark, lineHeight: 30,
  },

  // Steps
  stepsList: { paddingHorizontal: 16, flex: 1 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  circle: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  circleDone:    { backgroundColor: C.red },
  circleActive:  { backgroundColor: 'transparent', borderWidth: 2, borderColor: C.red },
  circleWaiting: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.veryMuted },
  tick:          { color: '#fff', fontSize: 10, fontWeight: '700' },
  activeDot:     { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.red },
  stepBody:      { flex: 1 },
  stepTitle:     { fontSize: 13, fontWeight: '600', color: C.dark, lineHeight: 17 },
  stepTitleMuted:{ color: C.dimText, fontWeight: '400' },
  stepSub: {
    fontSize: 8, fontWeight: '600', letterSpacing: 0.8,
    color: C.mutedText, lineHeight: 12, marginTop: 1,
  },
  stepRight:     { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: C.dimText, minWidth: 28, textAlign: 'right' },
  stepRightDone: { color: C.red },

  // Progress
  progressTrack: { height: 4, backgroundColor: 'rgba(26,14,12,0.08)', overflow: 'hidden' },
  progressFill:  { height: '100%', overflow: 'hidden' },
})
