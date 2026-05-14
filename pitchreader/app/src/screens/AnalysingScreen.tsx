import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Animated,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { theme } from '../theme'
import { analysePitch } from '../lib/api'
import NavLogo from '../components/NavLogo'

type Props = NativeStackScreenProps<RootStackParamList, 'Analysing'>
type StepState = 'waiting' | 'active' | 'done'

const TIPS = [
  "Did you know? The toss is won by the pitch as often as the captain.",
  "A green pitch in Leeds plays differently to a green pitch in London.",
  "Club pitches tell more stories than Test pitches — every bounce counts.",
  "The first 3 overs on a damp English morning can win you the match.",
]

export default function AnalysingScreen({ route, navigation }: Props) {
  const { photos, groundName, overs, lat, lng, squad } = route.params

  const [stepStates, setStepStates] = useState<StepState[]>(['done', 'active', 'waiting', 'waiting'])
  const [weatherLabel, setWeatherLabel] = useState('Fetching live weather...')
  const [error, setError] = useState<string | null>(null)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])

  const rotation = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start()

    const timer = setTimeout(() => {
      setStepStates(['done', 'done', 'active', 'waiting'])
      setWeatherLabel('Weather fetched')
    }, 1000)

    ;(async () => {
      try {
        const result = await analysePitch({
          imageBase64Array: photos,
          lat,
          lng,
          groundName,
          overs,
          squad,
        })

        const conditions =
          result?.weather?.conditions ??
          result?.weather?.description ??
          result?.conditions ??
          null
        if (conditions) {
          setWeatherLabel(`Weather fetched — ${conditions}`)
        }

        setStepStates(['done', 'done', 'done', 'active'])

        setTimeout(() => {
          navigation.navigate('Report', { result, groundName, overs, squad })
        }, 800)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })()

    return () => clearTimeout(timer)
  }, [])

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const stepLabels = [
    '4 photos uploaded',
    weatherLabel,
    'AI reading the surface...',
    "Generating captain's report",
  ]

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

  return (
    <SafeAreaView style={styles.root}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <NavLogo />
        <Text style={styles.navSubtitle}>{groundName} · {overs} overs · 4 photos</Text>
      </View>

      {/* Ball animation */}
      <View style={styles.ballSection}>
        <Animated.View style={[styles.ball, { transform: [{ rotate }] }]}>
          <View style={styles.seamLeft} />
          <View style={styles.seamRight} />
        </Animated.View>
        <Text style={styles.readingText}>Reading your pitch</Text>
      </View>

      {/* Progress steps */}
      <View style={styles.steps}>
        {stepStates.map((state, i) => {
          const icon = state === 'done' ? '✓' : state === 'active' ? '👁' : '🕐'
          const textColor =
            state === 'done' ? theme.green.mid :
            state === 'active' ? theme.skyDark :
            theme.text.muted

          return (
            <Animated.View
              key={i}
              style={[styles.step, state === 'active' && { opacity: pulse }]}
            >
              <Text style={styles.stepIcon}>{icon}</Text>
              <Text style={[styles.stepLabel, { color: textColor }]}>{stepLabels[i]}</Text>
            </Animated.View>
          )
        })}
      </View>

      {/* Tip */}
      <Text style={styles.tip}>{tip}</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.soil,
  },
  errorRoot: {
    flex: 1,
    backgroundColor: theme.soil,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  navBar: {
    backgroundColor: theme.green.dark,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  navTitle: {
    color: theme.white,
    fontSize: 18,
    fontWeight: '500',
  },
  navSubtitle: {
    color: theme.green.light,
    fontSize: 11,
    marginTop: 3,
  },
  ballSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#c0392b',
    overflow: 'hidden',
    marginBottom: 16,
  },
  seamLeft: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'white',
    left: -12,
    top: 12,
  },
  seamRight: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'white',
    right: -12,
    bottom: 12,
  },
  readingText: {
    color: theme.text.dark,
    fontSize: 15,
    fontWeight: '500',
  },
  steps: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.soilBorder,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  stepIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  stepLabel: {
    fontSize: 14,
    flex: 1,
  },
  tip: {
    fontStyle: 'italic',
    color: theme.text.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: theme.green.mid,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  retryBtnText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: '500',
  },
})
