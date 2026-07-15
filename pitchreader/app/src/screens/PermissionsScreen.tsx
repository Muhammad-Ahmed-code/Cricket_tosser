import React, { useState } from 'react'
import {
  View,
  Text,
  Image,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import { useAuth } from '@clerk/clerk-expo'
import {
  useFonts,
  PlusJakartaSans_800ExtraBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Inter_700Bold, Inter_600SemiBold, Inter_500Medium, Inter_400Regular } from '@expo-google-fonts/inter'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { initMixpanel } from '../lib/analytics'

const appIconImg = require('../../assets/images/app-icon.png')

type Props = NativeStackScreenProps<RootStackParamList, 'Permissions'>

const C = {
  cream:       '#F7F2E8',
  paper:       '#FFFDF7',
  forest:      '#104020',
  pitch:       '#507020',
  olive:       '#708040',
  ball:        '#903020',
  line:        '#D8D4C5',
  textPrimary: '#14351F',
  textMuted:   '#52624A',
}

export default function PermissionsScreen({ navigation }: Props) {
  const { isSignedIn } = useAuth()
  const [analyticsOn, setAnalyticsOn] = useState(true)

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    'PlusJakartaSans-Bold':      PlusJakartaSans_700Bold,
    'Inter-Bold':                Inter_700Bold,
    'Inter-SemiBold':            Inter_600SemiBold,
    'Inter-Medium':              Inter_500Medium,
    'Inter-Regular':             Inter_400Regular,
  })

  const handleLetsGo = async () => {
    // Request native permissions (fire-and-forget — user can deny)
    try { await Notifications.requestPermissionsAsync() } catch {}
    try { await Location.requestForegroundPermissionsAsync() } catch {}

    // Analytics consent
    if (analyticsOn) {
      await AsyncStorage.setItem('analyticsEnabled', 'true')
      await initMixpanel()
    } else {
      await AsyncStorage.setItem('analyticsEnabled', 'false')
    }

    await AsyncStorage.setItem('has_seen_permissions', 'true')

    const dest = isSignedIn ? 'Home' : 'Auth'
    navigation.replace(dest)
  }

  if (!fontsLoaded) return null

  return (
    <SafeAreaView style={st.root}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={st.logoWrap}>
          <Image source={appIconImg} style={st.logo} resizeMode="contain" />
        </View>

        {/* Header */}
        <Text style={st.title}>Before we start 🏏</Text>
        <Text style={st.subtitle}>
          Cricket Tosser needs a few permissions to give you the best experience
        </Text>

        {/* Notifications card */}
        <View style={st.card}>
          <View style={st.cardIcon}>
            <Text style={st.cardEmoji}>🔔</Text>
          </View>
          <View style={st.cardBody}>
            <View style={st.cardTitleRow}>
              <Text style={st.cardTitle}>Match reminders</Text>
              <View style={[st.badge, st.badgeRecommended]}>
                <Text style={[st.badgeText, st.badgeTextRecommended]}>Recommended</Text>
              </View>
            </View>
            <Text style={st.cardDesc}>
              We'll remind you to log your toss and match results after your game
            </Text>
          </View>
        </View>

        {/* Location card */}
        <View style={st.card}>
          <View style={st.cardIcon}>
            <Text style={st.cardEmoji}>📍</Text>
          </View>
          <View style={st.cardBody}>
            <View style={st.cardTitleRow}>
              <Text style={st.cardTitle}>Your location</Text>
              <View style={st.badge}>
                <Text style={st.badgeText}>Optional</Text>
              </View>
            </View>
            <Text style={st.cardDesc}>
              Used to auto-detect your ground and fetch live weather for your match
            </Text>
          </View>
        </View>

        {/* Analytics card */}
        <View style={st.card}>
          <View style={st.cardIcon}>
            <Text style={st.cardEmoji}>📊</Text>
          </View>
          <View style={st.cardBody}>
            <View style={st.cardTitleRow}>
              <Text style={st.cardTitle}>Help improve the app</Text>
              <View style={st.badge}>
                <Text style={st.badgeText}>Optional</Text>
              </View>
            </View>
            <Text style={st.cardDesc}>
              Share anonymous usage data so we can make Cricket Tosser better. No personal data, never sold.
            </Text>
            <View style={st.toggleRow}>
              <Text style={st.toggleLabel}>{analyticsOn ? 'Enabled' : 'Disabled'}</Text>
              <Switch
                value={analyticsOn}
                onValueChange={setAnalyticsOn}
                trackColor={{ false: C.line, true: C.pitch }}
                thumbColor={C.paper}
              />
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* CTA */}
      <View style={st.ctaWrap}>
        <TouchableOpacity style={st.ctaBtn} onPress={handleLetsGo} activeOpacity={0.85}>
          <Text style={st.ctaText}>Let's go</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.cream },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },

  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logo:     { width: 88, height: 88, borderRadius: 20 },

  title: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 28,
    letterSpacing: -0.5,
    color: C.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.textMuted,
    marginBottom: 28,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: C.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginBottom: 14,
    gap: 14,
    shadowColor: C.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eef2e6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardEmoji: { fontSize: 22 },
  cardBody:  { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: C.textPrimary,
  },
  cardDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.textMuted,
  },

  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.cream,
  },
  badgeRecommended: {
    borderColor: '#b8d0a0',
    backgroundColor: '#eef4e8',
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: C.textMuted,
  },
  badgeTextRecommended: { color: C.pitch },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  toggleLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: C.textMuted,
  },

  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.cream,
  },
  ctaBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: C.ball,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#802020',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  ctaText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 17,
    color: '#FFFDF7',
    letterSpacing: 0.3,
  },
})
