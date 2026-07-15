import React, { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet } from 'react-native'

const COIN_EMBLEM = require('../../assets/coin-emblem.png')
const COIN_TAILS  = require('../../assets/coin-tails.png')

// rotX spans [-90, 1082]; heads faces the viewer when rotX mod 360 ∈ (-90, 90).
// On Android backfaceVisibility is unreliable, so we also drive each face's opacity
// from rotX: opacity switches at the 90° / 270° edge-on points (0.2° wide so the
// cross-fade is imperceptibly fast at animation speed ~836 deg/s → ~0.24 ms).
const FLIP_IN  = [-90, 89.9, 90.1, 269.9, 270.1, 449.9, 450.1, 629.9, 630.1, 809.9, 810.1, 989.9, 990.1, 1082]
const HEADS_OP = [  1,    1,    0,     0,     1,     1,     0,     0,     1,     1,     0,     0,     1,    1]
const TAILS_OP = [  0,    0,    1,     1,     0,     0,     1,     1,     0,     0,     1,     1,     0,    0]

interface CoinProps {
  size?: number
  onLanded?: () => void
}

export default function Coin({ size = 206, onLanded }: CoinProps) {
  const transY  = useRef(new Animated.Value(600)).current
  const scale   = useRef(new Animated.Value(0.2)).current
  const opacity = useRef(new Animated.Value(0)).current
  // rotX drives both faces via two interpolations 180° apart.
  // Range -90 → 1082 covers entrance flip + idle bob peak.
  const rotX = useRef(new Animated.Value(-90)).current

  const headsRotX = rotX.interpolate({ inputRange: [-90, 1082], outputRange: ['-90deg', '1082deg'] })
  // Tails face is pre-flipped 180° so it starts hidden and shows when container is "behind"
  const tailsRotX = rotX.interpolate({ inputRange: [-90, 1082], outputRange: ['90deg', '1262deg'] })

  // Android-only: opacity interpolations that replicate backfaceVisibility behaviour
  const androidHeadsOp = Platform.OS === 'android'
    ? rotX.interpolate({ inputRange: FLIP_IN, outputRange: HEADS_OP, extrapolate: 'clamp' })
    : undefined
  const androidTailsOp = Platform.OS === 'android'
    ? rotX.interpolate({ inputRange: FLIP_IN, outputRange: TAILS_OP, extrapolate: 'clamp' })
    : undefined

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) {
        transY.setValue(0)
        scale.setValue(1)
        opacity.setValue(1)
        rotX.setValue(1082)
        onLanded?.()
        return
      }

      Animated.parallel([
        // Rise from below with overshoot — total 1400ms (980 + 238 + 182)
        Animated.sequence([
          Animated.timing(transY, { toValue: -16,  duration: 980,  easing: Easing.bezier(0.18, 0.7, 0.25, 1), useNativeDriver: true }),
          Animated.timing(transY, { toValue: 5,    duration: 238,  easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(transY, { toValue: 0,    duration: 182,  easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08,  duration: 980,  easing: Easing.bezier(0.18, 0.7, 0.25, 1), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.985, duration: 238,  easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,     duration: 182,  easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }),
        // End-over-end flip: rotateX -90° → 1080° in 1400ms (lands face-on, heads up)
        Animated.timing(rotX, { toValue: 1080, duration: 1400, easing: Easing.bezier(0.12, 0.62, 0.2, 1), useNativeDriver: true }),
      ]).start(() => {
        onLanded?.()
        // Settle at 2° (1082) then bob to -7° (1073) and back — never sits at exact 0°
        rotX.setValue(1082)
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotX, { toValue: 1073, duration: 2750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(rotX, { toValue: 1082, duration: 2750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ).start()
      })
    })
  }, [])

  return (
    <Animated.View style={{ width: size, height: size, opacity, transform: [{ translateY: transY }, { scale }] }}>
      {/* TAILS — first in render order so heads wins the flat-context paint fallback */}
      <Animated.Image
        source={COIN_TAILS}
        style={[
          styles.face,
          { width: size, height: size, transform: [{ perspective: 1100 }, { rotateX: tailsRotX }] },
          androidTailsOp !== undefined && { opacity: androidTailsOp },
        ]}
        resizeMode="contain"
      />
      {/* HEADS — last in render order (wins flat fallback) */}
      <Animated.Image
        source={COIN_EMBLEM}
        style={[
          styles.face,
          { width: size, height: size, transform: [{ perspective: 1100 }, { rotateX: headsRotX }] },
          androidHeadsOp !== undefined && { opacity: androidHeadsOp },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
    shadowColor: '#781408',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 26,
  },
})
