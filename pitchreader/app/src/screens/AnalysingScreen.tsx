import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { G, Line, Circle, Path } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import * as ExpoCrypto from 'expo-crypto'
import { analysePitch } from '../lib/api'
import { usageStore } from '../lib/usageStore'
import { reportHistoryStore } from '../lib/reportHistoryStore'
import { weatherCache } from '../lib/weatherCache'
import { scheduleReminderNotification } from '../lib/notificationService'
import { useAuth } from '@clerk/clerk-expo'
import { track } from '../lib/analytics'
import {
  useFonts,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono'

const { width: SW } = Dimensions.get('window')

// Design tokens — cream / ink / oxblood palette
const A = {
  bg:       '#f1ead8',
  spot:     '#fff5dd',
  ink:      '#1a0e0c',
  inkSoft:  'rgba(26,14,12,0.62)',
  inkLow:   'rgba(26,14,12,0.42)',
  inkFaint: 'rgba(26,14,12,0.16)',
  inkHair:  'rgba(26,14,12,0.09)',
  oxblood:  '#a8331f',
  ok:       '#1f6b3a',
}

const COIN_EMBLEM = require('../../assets/coin-emblem.png')
const COIN_TAILS  = require('../../assets/coin-tails.png')

// Android: opacity interpolations for rotateY spinner — replicates backfaceVisibility.
// Heads faces viewer when coinRotY ∈ [0,90) ∪ (270,360]; tails the inverse.
const SPIN_IN       = [0, 89.9, 90.1, 269.9, 270.1, 360]
const SPIN_HEADS_OP = [1,    1,    0,     0,     1,    1]
const SPIN_TAILS_OP = [0,    0,    1,     1,     0,    0]

// (AnimatedG removed — SVG rotation driven via state listener instead)

type Props = NativeStackScreenProps<RootStackParamList, 'Analysing'>
type StepState = 'done' | 'active' | 'pending'

const STEPS = [
  { label: 'Decoding photos',             sub: '4 / 4 ingested' },
  { label: 'Mapping surface texture',     sub: 'grain · density · sheen' },
  { label: 'Detecting cracks & moisture', sub: 'high-pass · saturation' },
  { label: 'Comparing ends · A vs B',     sub: 'differential wear' },
  { label: 'Pulling live weather',        sub: 'temp · dew · wind' },
  { label: 'Generating match read',       sub: 'forecast · 1st · 2nd inn' },
]

const HERO_SIZE  = 212
const COIN_INSET = 0.17
const COIN_SIZE  = Math.round(HERO_SIZE * (1 - COIN_INSET * 2))  // ~140px

function useScrambler(period: number): string {
  const [val, setVal] = useState(() => Math.floor(Math.random() * 100))
  useEffect(() => {
    const id = setInterval(
      () => setVal(Math.floor(Math.random() * 100)),
      period + Math.random() * 30,
    )
    return () => clearInterval(id)
  }, [period])
  return String(val).padStart(2, '0')
}

function localHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function AnalysingScreen({ route, navigation }: Props) {
  const { photos, groundName, overs, lat, lng, squad } = route.params
  const { userId } = useAuth()

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  })

  // ── App state ────────────────────────────────────────────────────────────
  const [stepStates, setStepStates] = useState<StepState[]>([
    'active', 'pending', 'pending', 'pending', 'pending', 'pending',
  ])
  const [step5Sub, setStep5Sub]       = useState(STEPS[4].sub)
  const [pct, setPct]                 = useState(0)
  const [error, setError]             = useState<string | null>(null)
  const [localTime]                   = useState(localHHMM)
  const [statusMessage, setStatusMessage] = useState('Reading your pitch photos...')

  // Scramblers
  const scrMoisture = useScrambler(160)
  const scrCracks   = useScrambler(190)
  const scrDew      = useScrambler(210)
  const scrToken    = useScrambler(110)

  // SVG rotation state — driven by sweepAnim listener (JS thread)
  const [rotDeg, setRotDeg] = useState(0)

  // ── Animations ──────────────────────────────────────────────────────────
  const sweepAnim    = useRef(new Animated.Value(0)).current  // JS driver (SVG prop)
  const breatheAnim  = useRef(new Animated.Value(0)).current
  const dotPulse     = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current  // 0-100

  // Coin entrance (native driver)
  const coinTransY  = useRef(new Animated.Value(600)).current
  const coinScale   = useRef(new Animated.Value(0.2)).current
  const coinOpacity = useRef(new Animated.Value(0)).current
  const coinRotX    = useRef(new Animated.Value(-90)).current
  // Coin toss – rotateY applied per face
  const coinRotY    = useRef(new Animated.Value(0)).current

  // ── Derived interpolations ───────────────────────────────────────────────
  const breatheScale   = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] })
  const breatheOpacity = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })

  const dotScale   = dotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] })
  const dotOpacity = dotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })

  const coinRotXDeg   = coinRotX.interpolate({ inputRange: [-90, 1440], outputRange: ['-90deg', '1440deg'] })
  const coinFrontRotY = coinRotY.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] })
  const coinBackRotY  = coinRotY.interpolate({ inputRange: [0, 360], outputRange: ['180deg', '540deg'] })
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })

  // Android-only: opacity drives visibility instead of relying on backfaceVisibility
  const androidSpinHeadsOp = Platform.OS === 'android'
    ? coinRotY.interpolate({ inputRange: SPIN_IN, outputRange: SPIN_HEADS_OP, extrapolate: 'clamp' })
    : undefined
  const androidSpinTailsOp = Platform.OS === 'android'
    ? coinRotY.interpolate({ inputRange: SPIN_IN, outputRange: SPIN_TAILS_OP, extrapolate: 'clamp' })
    : undefined

  // ── Eyebrow step counter ─────────────────────────────────────────────────
  const activeIdx = stepStates.findIndex(s => s === 'active')
  const stepNum   = String(
    Math.min(6, activeIdx >= 0 ? activeIdx + 1 : stepStates.filter(s => s === 'done').length)
  ).padStart(2, '0')

  // ── Preflight warmup (keep existing) ────────────────────────────────────
  useEffect(() => {
    fetch(process.env.EXPO_PUBLIC_FUNCTION_URL!, { method: 'OPTIONS' }).catch(() => {})
  }, [])

  // ── Start all animations ─────────────────────────────────────────────────
  useEffect(() => {
    // Listener: drive SVG rotation state (JS thread; SVG can't use native driver)
    const sweepListenerId = sweepAnim.addListener(({ value }) => setRotDeg(value * 360))

    // Scanner sweep: 2.6s linear infinite (JS driver — SVG prop)
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: false,
      })
    ).start()

    // Breathe: 1.4s ease-in-out infinite
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()

    // Dot pulse: 1s ease-in-out infinite
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()

    // Coin entrance: coinEnter + coinSpinIn in parallel, once
    Animated.parallel([
      Animated.sequence([
        Animated.timing(coinTransY, { toValue: -16, duration: 980,  easing: Easing.bezier(0.18, 0.7, 0.25, 1), useNativeDriver: true }),
        Animated.timing(coinTransY, { toValue: 5,   duration: 238,  easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(coinTransY, { toValue: 0,   duration: 182,  easing: Easing.linear, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(coinScale, { toValue: 1.08,  duration: 980, easing: Easing.bezier(0.18, 0.7, 0.25, 1), useNativeDriver: true }),
        Animated.timing(coinScale, { toValue: 0.985, duration: 238, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(coinScale, { toValue: 1,     duration: 182, easing: Easing.linear, useNativeDriver: true }),
      ]),
      Animated.timing(coinOpacity, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(coinRotX, { toValue: 1440, duration: 1400, easing: Easing.bezier(0.12, 0.62, 0.2, 1), useNativeDriver: true }),
    ]).start(() => {
      // After entrance, start infinite coinToss (rotateY)
      Animated.loop(
        Animated.timing(coinRotY, {
          toValue: 360, duration: 2600, easing: Easing.bezier(0.5, 0, 0.5, 1), useNativeDriver: true,
        })
      ).start()
    })

    return () => {
      sweepAnim.removeListener(sweepListenerId)
    }
  }, [])

  // ── Progress listener ────────────────────────────────────────────────────
  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => setPct(Math.round(value)))
    return () => progressAnim.removeListener(id)
  }, [])

  // ── Main analysis effect (preserve existing logic) ────────────────────────
  useEffect(() => {
    if (!usageStore.getIsSubscribed() && usageStore.getReportCount() >= 3) {
      navigation.replace('Paywall', { trigger: 'limit_reached' })
      return
    }

    // Squad adds ~14s to inference (avg measured terse: no-squad ~28s, with-squad ~42s)
    const hasSquad = !!squad
    const EXPECTED_DURATION_MS = hasSquad ? 45000 : 30000

    // Steps spread proportionally across expected duration
    const t1 = setTimeout(() => setStepStates(['done', 'active',   'pending', 'pending', 'pending', 'pending']), hasSquad ?  6000 :  4000)
    const t2 = setTimeout(() => setStepStates(['done', 'done',     'active',  'pending', 'pending', 'pending']), hasSquad ? 12000 :  8000)
    const t3 = setTimeout(() => setStepStates(['done', 'done',     'done',    'active',  'pending', 'pending']), hasSquad ? 19000 : 13000)
    const t4 = setTimeout(() => setStepStates(['done', 'done',     'done',    'done',    'active',  'pending']), hasSquad ? 27000 : 18000)
    const t5 = setTimeout(() => setStepStates(['done', 'done',     'done',    'done',    'done',    'active'  ]), hasSquad ? 36000 : 24000)

    // Progress: increment evenly to 95% over expected duration, never freeze
    const INTERVAL_MS = 200
    const progressIncrement = 95 / (EXPECTED_DURATION_MS / INTERVAL_MS)
    const analysisStart = Date.now()
    let currentPct = 0
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - analysisStart
      currentPct = Math.min(95, currentPct + progressIncrement)
      progressAnim.setValue(currentPct)
      if (hasSquad) {
        if      (elapsed <  5000) setStatusMessage('Reading your pitch photos...')
        else if (elapsed < 10000) setStatusMessage('Checking live weather conditions...')
        else if (elapsed < 18000) setStatusMessage('Analysing surface texture and wear...')
        else if (elapsed < 27000) setStatusMessage('Calculating pitch behaviour by phase...')
        else if (elapsed < 36000) setStatusMessage("Building your captain's report...")
        else if (elapsed < 43000) setStatusMessage('Adding final recommendations...')
        else                       setStatusMessage('Almost ready...')
      } else {
        if      (elapsed <  3000) setStatusMessage('Reading your pitch photos...')
        else if (elapsed <  7000) setStatusMessage('Checking live weather conditions...')
        else if (elapsed < 12000) setStatusMessage('Analysing surface texture and wear...')
        else if (elapsed < 18000) setStatusMessage('Calculating pitch behaviour by phase...')
        else if (elapsed < 25000) setStatusMessage("Building your captain's report...")
        else if (elapsed < 29000) setStatusMessage('Adding final recommendations...')
        else                       setStatusMessage('Almost ready...')
      }
    }, INTERVAL_MS)

    ;(async () => {
      try {
        const clientReportId = ExpoCrypto.randomUUID()
        const cachedWeather  = weatherCache.get(lat, lng)
        const result = await analysePitch({
          imageBase64Array: photos, lat, lng, groundName, overs, squad,
          userId: userId ?? null, weather: cachedWeather, reportId: clientReportId,
        })

        const general    = result?.general ?? result?.prediction ?? result
        const teamResult = result?.team ?? null

        const weather    = result?.weather ?? {}
        const conditions = weather?.conditions ?? weather?.description ?? result?.conditions ?? ''

        if (conditions) setStep5Sub(`${groundName.toUpperCase()} · ${conditions.toUpperCase()}`)
        else            setStep5Sub(groundName.toUpperCase())

        clearInterval(progressInterval)
        setStatusMessage('Report ready!')
        setStepStates(['done', 'done', 'done', 'done', 'done', 'active'])
        Animated.timing(progressAnim, { toValue: 100, duration: 700, useNativeDriver: false }).start()

        await usageStore.incrementReportCount()

        const reportId: string = result?.reportId ?? clientReportId

        reportHistoryStore.save({
          id:              reportId ?? `local_${Date.now()}`,
          ground_name:     groundName,
          overs,
          match_date:      new Date().toISOString().split('T')[0],
          created_at:      new Date().toISOString(),
          prediction:      general,
          weather:         result?.weather ?? {},
          weather_snapshot: result?.weather_snapshot ?? null,
          generated_at:    result?.generated_at ?? new Date().toISOString(),
          team_prediction: teamResult ?? null,
          squad:           squad ?? null,
          photo_urls:      photos.map(b => `data:image/jpeg;base64,${b}`),
        }).then(() => {
          scheduleReminderNotification(reportId, groundName)
        }).catch(() => {})

        const reportFormat =
          overs === 20 ? 'T20' :
          overs === 40 ? 'T40' :
          overs === 50 ? 'ODI' : 'custom'
        track('report_generated', {
          ground_name: groundName,
          format: reportFormat,
          overs,
          photo_count: photos.length,
          squad_entered: !!squad,
          has_weather: !!(result?.weather && Object.keys(result.weather).length > 0),
          reports_used: usageStore.getReportCount(),
        })

        const photoUris = photos.map(b => `data:image/jpeg;base64,${b}`)
        const reportResult = {
          prediction:      general,
          weather:         result?.weather ?? {},
          weather_snapshot: result?.weather_snapshot ?? null,
          generated_at:    result?.generated_at ?? new Date().toISOString(),
        }
        setTimeout(() => navigation.replace('Report', { result: reportResult, teamResult, groundName, overs, squad, reportId, photoUris }), 350)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })()

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5)
      clearInterval(progressInterval)
    }
  }, [])

  // ── Error state ──────────────────────────────────────────────────────────
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

  // Block render until fonts ready (avoids flash of unstyled text)
  if (!fontsLoaded) return <View style={styles.fontWait} />

  return (
    <View style={styles.root}>
      {/* Background: approximate radial-gradient with linear */}
      <LinearGradient
        colors={[A.spot, A.bg, '#e8e0cb']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>

        {/* ── A) HEADER ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLeft}>
              <Animated.View style={[
                styles.breatheDot,
                { transform: [{ scale: breatheScale }], opacity: breatheOpacity },
              ]} />
              <Text style={styles.eyebrowText}>ANALYZING</Text>
            </View>
            <Text style={styles.eyebrowText}>STEP {stepNum} / 06</Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.titleMain}>Reading the </Text>
            <Text style={styles.titleItalic}>pitch report.</Text>
          </View>
        </View>

        {/* ── B) HERO — coin + scanner ring ───────────────────────────────── */}
        <View style={styles.heroWrap}>
          {/* Static scanner rings and tick marks */}
          <View style={styles.scannerStatic} pointerEvents="none">
            <Svg width={HERO_SIZE} height={HERO_SIZE} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="48.5" fill="none" stroke={A.inkFaint} strokeWidth="0.4" />
              <Circle cx="50" cy="50" r="44"   fill="none" stroke={A.inkFaint} strokeWidth="0.3"
                strokeDasharray="0.5 2.2" />
              {Array.from({ length: 60 }).map((_, i) => {
                const major = i % 5 === 0
                return (
                  <Line key={i}
                    x1="50" y1={major ? 1.5 : 2.2}
                    x2="50" y2={major ? 4.0 : 3.2}
                    stroke={A.ink}
                    strokeOpacity={major ? 0.35 : 0.14}
                    strokeWidth={major ? 0.5 : 0.3}
                    transform={`rotate(${i * 6} 50 50)`}
                  />
                )
              })}
            </Svg>
          </View>

          {/* Rotating sweep arm + orbiting dot — state-driven SVG transform */}
          <View style={styles.scannerRotating} pointerEvents="none">
            <Svg width={HERO_SIZE} height={HERO_SIZE} viewBox="0 0 100 100">
              {/* rotate(deg cx cy) — SVG-native pivot, always correct */}
              <G transform={`rotate(${rotDeg} 50 50)`}>
                {/* Sweep wedge fill */}
                <Path
                  d="M50 50 L50 1.5 A48.5 48.5 0 0 1 82.5 14.5 Z"
                  fill={A.oxblood}
                  fillOpacity={0.16}
                />
                {/* Orbiting dot glow (larger, low opacity) */}
                <Circle cx="50" cy="2.5" r="4"   fill={A.oxblood} fillOpacity={0.18} />
                {/* Orbiting dot solid */}
                <Circle cx="50" cy="2.5" r="2.2" fill={A.oxblood} fillOpacity={0.9} />
                {/* Progress arc accent — rotates with sweep */}
                <Circle cx="50" cy="50" r="48.5" fill="none"
                  stroke={A.oxblood} strokeOpacity="0.45" strokeWidth="0.9"
                  strokeDasharray="22 285" strokeLinecap="round"
                />
              </G>
            </Svg>
          </View>

          {/* Coin flip */}
          <Animated.View style={[
            styles.coinWrap,
            {
              opacity:   coinOpacity,
              transform: [
                { translateY: coinTransY },
                { scale:      coinScale  },
                { perspective: 800       },
                { rotateX:    coinRotXDeg },
              ],
            },
          ]}>
            {/* Front face — coin emblem (heads) */}
            <Animated.Image
              source={COIN_EMBLEM}
              style={[
                styles.coinFace,
                {
                  backfaceVisibility: 'hidden',
                  transform: [{ perspective: 800 }, { rotateY: coinFrontRotY }],
                },
                androidSpinHeadsOp !== undefined && { opacity: androidSpinHeadsOp },
              ]}
              resizeMode="contain"
            />
            {/* Back face — coin tails (wicket/stumps), pre-rotated 180° */}
            <Animated.Image
              source={COIN_TAILS}
              style={[
                styles.coinFace,
                {
                  backfaceVisibility: 'hidden',
                  transform: [{ perspective: 800 }, { rotateY: coinBackRotY }],
                },
                androidSpinTailsOp !== undefined && { opacity: androidSpinTailsOp },
              ]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* ── C) TELEMETRY STRIP ──────────────────────────────────────────── */}
        <View style={styles.telemCard}>
          <View style={styles.telemCell}>
            <Text style={styles.telemLabel}>SEAM</Text>
            <Text style={styles.telemValue}>70°</Text>
          </View>
          <View style={styles.telemDivider} />
          <View style={styles.telemCell}>
            <Text style={styles.telemLabel}>MOISTURE</Text>
            <Text style={styles.telemValue}>{scrMoisture}%</Text>
          </View>
          <View style={styles.telemDivider} />
          <View style={styles.telemCell}>
            <Text style={styles.telemLabel}>CRACKS</Text>
            <Text style={styles.telemValue}>0.{scrCracks}</Text>
          </View>
          <View style={styles.telemDivider} />
          <View style={styles.telemCell}>
            <Text style={styles.telemLabel}>DEW PT</Text>
            <Text style={styles.telemValue}>{scrDew}°</Text>
          </View>
        </View>

        {/* ── D) STEP TIMELINE ────────────────────────────────────────────── */}
        <View style={styles.stepList}>
          {STEPS.map((step, i) => {
            const state    = stepStates[i]
            const isDone   = state === 'done'
            const isActive = state === 'active'
            const isLast   = i === STEPS.length - 1
            const sub      = i === 4 && isActive ? step5Sub : step.sub

            return (
              <View
                key={i}
                style={[styles.stepRow, { opacity: isDone ? 0.7 : isActive ? 1 : 0.45 }]}
              >
                {/* Timeline: circle + connector */}
                <View style={styles.timelineCol}>
                  <View style={[
                    styles.stepCircle,
                    isDone   ? styles.circleDone    :
                    isActive ? styles.circleActive  :
                               styles.circlePending,
                  ]}>
                    {isDone && (
                      <Svg width={11} height={11} viewBox="0 0 24 24">
                        <Path d="M5 12.5l4 4 10-10" stroke="#f5ead0" strokeWidth="3"
                          strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </Svg>
                    )}
                    {isActive && (
                      <Animated.View style={[
                        styles.activeDot,
                        { transform: [{ scale: dotScale }], opacity: dotOpacity },
                      ]} />
                    )}
                  </View>
                  {!isLast && (
                    <View style={[
                      styles.stepConnector,
                      { backgroundColor: isDone ? A.oxblood : A.inkHair },
                    ]} />
                  )}
                </View>

                {/* Label + status token */}
                <View style={[styles.stepBody, !isLast && { paddingBottom: 11 }]}>
                  <View style={styles.stepTopRow}>
                    <Text style={[
                      styles.stepLabel,
                      isActive && { fontFamily: 'BricolageGrotesque_700Bold' },
                    ]}>
                      {step.label}
                    </Text>
                    <Text style={[styles.stepToken, isDone && { color: A.ok }]}>
                      {isDone ? 'OK' : isActive ? scrToken : '··'}
                    </Text>
                  </View>
                  {(isDone || isActive) && (
                    <Text style={[
                      styles.stepSub,
                      { color: isActive ? A.oxblood : A.inkLow },
                    ]}>
                      {sub.toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {/* ── E) PROGRESS RAIL ────────────────────────────────────────────── */}
        <View style={styles.progressRail}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel} numberOfLines={1}>
              {statusMessage}
            </Text>
            <Text style={styles.progressPct}>
              {String(pct).padStart(2, '0')}
              <Text style={styles.progressPctUnit}>%</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
              <LinearGradient
                colors={[A.oxblood, '#d97a4a']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>

      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  // Root
  root:     { flex: 1 },
  safe:     { flex: 1 },
  fontWait: { flex: 1, backgroundColor: A.bg },

  // Error
  errorRoot: {
    flex: 1, backgroundColor: A.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  errorText: {
    color: A.oxblood, fontSize: 15, textAlign: 'center', marginBottom: 20,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  retryBtn:     { backgroundColor: A.oxblood, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  retryBtnText: { color: '#FFFDF7', fontSize: 15, fontWeight: '600' },

  // ── A) Header
  header: { paddingHorizontal: 24, paddingTop: 16 },
  eyebrowRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  eyebrowLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  breatheDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: A.oxblood },
  eyebrowText: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      10,
    letterSpacing: 2.6,
    color:         A.inkSoft,
    textTransform: 'uppercase',
  },
  titleRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  titleMain: {
    fontFamily:    'BricolageGrotesque_700Bold',
    fontSize:      30,
    lineHeight:    29,
    letterSpacing: -1.05,
    color:         A.ink,
  },
  titleItalic: {
    fontFamily:    'BricolageGrotesque_400Regular',
    fontSize:      30,
    lineHeight:    29,
    letterSpacing: -1.05,
    color:         A.oxblood,
    fontStyle:     'italic',
  },

  // ── B) Hero
  heroWrap: {
    width:     HERO_SIZE,
    height:    HERO_SIZE,
    alignSelf: 'center',
    marginTop: 20,
  },
  scannerStatic: {
    position: 'absolute', top: 0, left: 0,
    width: HERO_SIZE, height: HERO_SIZE,
  },
  scannerRotating: {
    position: 'absolute', top: 0, left: 0,
    width: HERO_SIZE, height: HERO_SIZE,
  },
  coinWrap: {
    position: 'absolute',
    top:      Math.round(HERO_SIZE * COIN_INSET),
    left:     Math.round(HERO_SIZE * COIN_INSET),
    width:    COIN_SIZE,
    height:   COIN_SIZE,
  },
  coinFace: {
    position: 'absolute',
    top: 0, left: 0,
    width:  COIN_SIZE,
    height: COIN_SIZE,
  },

  // ── C) Telemetry
  telemCard: {
    flexDirection:   'row',
    marginHorizontal: 24,
    marginTop:        14,
    backgroundColor: 'rgba(255,248,232,0.7)',
    borderRadius:     14,
    borderWidth:      1,
    borderColor:      A.inkFaint,
    paddingVertical:  12,
    paddingHorizontal: 6,
    alignItems:       'stretch',
  },
  telemCell:    { flex: 1, alignItems: 'center', gap: 4 },
  telemDivider: { width: 1, backgroundColor: A.inkHair },
  telemLabel: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      8.5,
    letterSpacing: 1.5,
    color:         A.oxblood,
    textTransform: 'uppercase',
  },
  telemValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize:   16,
    color:      A.ink,
  },

  // ── D) Step timeline
  stepList: { paddingHorizontal: 28, marginTop: 14, flex: 1 },
  stepRow:  { flexDirection: 'row', gap: 14 },
  timelineCol: { width: 20, alignItems: 'center' },
  stepCircle: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, zIndex: 2,
  },
  circleDone: {
    backgroundColor: A.oxblood,
    borderWidth: 1, borderColor: A.oxblood,
  },
  circleActive: {
    backgroundColor: A.bg,
    borderWidth: 1.5, borderColor: A.ink,
  },
  circlePending: {
    backgroundColor: A.bg,
    borderWidth: 1, borderColor: A.inkFaint,
  },
  activeDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: A.ink,
  },
  stepConnector: { width: 1.5, flex: 1, minHeight: 13 },
  stepBody:      { flex: 1 },
  stepTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
  },
  stepLabel: {
    fontFamily:    'BricolageGrotesque_400Regular',
    fontSize:      15,
    color:         A.ink,
    letterSpacing: -0.15,
    flex:          1,
  },
  stepToken: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9.5,
    letterSpacing: 1.5,
    color:         A.inkLow,
    marginLeft:    8,
  },
  stepSub: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop:     3,
  },

  // ── E) Progress rail
  progressRail: { paddingHorizontal: 28, paddingBottom: 14 },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 8,
  },
  progressLabel: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      10,
    letterSpacing: 2,
    color:         A.inkSoft,
    textTransform: 'uppercase',
    flex:          1,
    marginRight:   8,
  },
  progressPct: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize:   14,
    color:      A.ink,
  },
  progressPctUnit: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize:   11,
    color:      A.inkLow,
  },
  progressTrack: {
    height: 3, backgroundColor: A.inkFaint, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', overflow: 'hidden' },
})
