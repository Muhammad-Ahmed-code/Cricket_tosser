import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  useFonts,
  Inter_700Bold,
  Inter_600SemiBold,
  Inter_500Medium,
} from '@expo-google-fonts/inter'

const logoImg = require('../../assets/logo.png')

interface AppHeaderProps {
  isSubscribed?: boolean
  reportsLeft?: number
  onBurger: () => void
  onFreePillPress?: () => void
  onLogoPress?: () => void
  hideBurger?: boolean
}

export default function AppHeader({
  isSubscribed = false,
  reportsLeft = 0,
  onBurger,
  onFreePillPress,
  onLogoPress,
  hideBurger = false,
}: AppHeaderProps) {
  useFonts({
    'Inter-Bold':     Inter_700Bold,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Medium':   Inter_500Medium,
  })

  return (
    <View>
      <View style={st.appBar}>
        <View style={st.appBarLeft}>
          {onLogoPress ? (
            <TouchableOpacity onPress={onLogoPress} activeOpacity={0.75}>
              <Image source={logoImg} style={st.appBarLogo} resizeMode="contain" />
            </TouchableOpacity>
          ) : (
            <Image source={logoImg} style={st.appBarLogo} resizeMode="contain" />
          )}
          <View>
            <View style={st.appTitleRow}>
              <Text style={st.appLine1}>CRICKET TOSSER</Text>
              {isSubscribed && (
                <View style={st.proBadge}>
                  <Text style={st.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={st.appLine2}>PITCH REPORT · V0.9</Text>
          </View>
        </View>
        <View style={st.appBarRight}>
          {!isSubscribed && onFreePillPress && (
            <TouchableOpacity
              onPress={onFreePillPress}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={st.freePill}>
                <View style={[st.freeDot, reportsLeft === 0 && st.freeDotEmpty]} />
                <Text style={st.freePillText}>{reportsLeft} of 3 free</Text>
              </View>
            </TouchableOpacity>
          )}
          {!hideBurger && (
            <TouchableOpacity
              style={st.burgerBtn}
              onPress={onBurger}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={st.burgerBars}>
                <View style={st.bar} />
                <View style={st.bar} />
                <View style={st.bar} />
              </View>
              <View style={st.burgerDot} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <LinearGradient
        colors={['#507020', '#708040']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={st.headerUnderline}
      />
    </View>
  )
}

const st = StyleSheet.create({
  appBarLogo: { height: 68, width: 68 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#104020',
    paddingTop: 7,
    paddingLeft: 0,
    paddingRight: 4,
    paddingBottom: 8,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  appTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  appLine1: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    letterSpacing: 1.8,
    color: '#FFFDF7',
  },
  proBadge: {
    backgroundColor: '#a8331f',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFDF7',
    letterSpacing: 0.8,
  },
  appLine2: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    color: 'rgba(255,253,247,0.5)',
    marginTop: 3,
  },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,253,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,253,247,0.18)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  freeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#708040' },
  freeDotEmpty: { backgroundColor: '#C0392B' },
  freePillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: 'rgba(255,253,247,0.92)',
  },
  burgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,253,247,0.2)',
    backgroundColor: 'rgba(255,253,247,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerBars: { gap: 4, alignItems: 'center' },
  bar: { width: 18, height: 2, backgroundColor: '#FFFDF7', borderRadius: 1 },
  burgerDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#903020',
    borderWidth: 2,
    borderColor: '#104020',
  },
  headerUnderline: { height: 3, opacity: 0.9 },
})
