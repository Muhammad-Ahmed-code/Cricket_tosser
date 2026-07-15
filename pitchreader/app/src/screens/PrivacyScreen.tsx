import React, { useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { track } from '../lib/analytics'

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>

const SECTIONS = [
  {
    title: 'What we collect',
    bullets: [
      'Photos you upload of cricket pitches (sent to Cricket Tosser for analysis, not stored permanently)',
      'Your location (GPS coordinates only, used to fetch weather and identify your ground — never stored as a precise address)',
      'Match data you choose to enter (toss results, match scores, squad info)',
      'Basic usage analytics via Mixpanel — anonymous event tracking, e.g. "report generated"',
      'Account info if you sign in (name and email via Google or Apple — stored securely via Clerk)',
    ],
  },
  {
    title: "What we don't collect",
    bullets: [
      'We do not sell your data to third parties',
      'We do not use your data for advertising',
      'We do not store your pitch photos after analysis is complete',
      'We do not track your precise location or movement',
    ],
  },
  {
    title: 'Third-party services we use',
    bullets: [
      'Clerk — authentication (Google/Apple sign-in). Privacy policy: clerk.com/privacy',
      'Supabase — secure database for storing your reports and match history',
      'Anthropic (Claude) — pitch photo analysis. Data is not used to train their models',
      'Mixpanel — anonymous usage analytics to improve the app',
      'RevenueCat — subscription management',
      'Open-Meteo — weather data (no personal data sent)',
      'Google Places — ground search (location queries only)',
    ],
  },
  {
    title: 'Data storage & security',
    bullets: [
      'Your reports and match history are stored securely in Supabase (Postgres)',
      'If you use anonymous mode, your data is stored locally on your device only',
      'You can delete your account and all associated data by contacting us',
    ],
  },
  {
    title: 'Push notifications',
    bullets: [
      'We send local reminders to log your toss and match results',
      'These are scheduled on your device — we do not use remote push notification servers',
      'You can disable notifications at any time in your device settings',
    ],
  },
  {
    title: "Children's privacy",
    bullets: [
      'Cricket Tosser is not directed at children under 13',
      'We do not knowingly collect data from children under 13',
    ],
  },
  {
    title: 'Changes to this policy',
    bullets: [
      'We may update this policy as the app evolves',
      'Continued use of the app after changes constitutes acceptance',
    ],
  },
  {
    title: 'Contact us',
    bullets: [
      'Questions about privacy? Email us at: privacy@crickettosser.com',
    ],
  },
]

export default function PrivacyScreen({ navigation }: Props) {
  useEffect(() => {
    track('privacy_screen_opened')
  }, [])

  return (
    <SafeAreaView style={st.root}>
      <View style={st.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={st.backText}>←</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>PRIVACY POLICY</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={st.headerDivider} />

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.hero}>
          <Text style={st.heroTitle}>Privacy Policy</Text>
          <Text style={st.heroSubtitle}>
            Cricket Tosser is built to help you win the toss — not to harvest your data.
          </Text>
          <Text style={st.lastUpdated}>Last updated: July 2026</Text>
        </View>

        {SECTIONS.map((section, si) => (
          <View key={si} style={st.section}>
            <View style={st.sectionHeadRow}>
              <View style={st.sectionNumBadge}>
                <Text style={st.sectionNum}>{String(si + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={st.sectionTitle}>{section.title}</Text>
            </View>
            {section.bullets.map((bullet, bi) => (
              <View key={bi} style={st.bulletRow}>
                <Text style={st.bulletDot}>·</Text>
                <Text style={st.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F2E8',
  },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#104020',
  },
  backText: {
    fontSize: 22,
    color: '#FFFDF7',
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: 'rgba(247,242,232,0.80)',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(247,242,232,0.15)',
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  hero: {
    backgroundColor: '#FFFDF7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(208,212,197,0.70)',
    padding: 20,
    marginBottom: 12,
    shadowColor: '#104020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#104020',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#52624A',
    lineHeight: 22,
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9AA18C',
    letterSpacing: 0.3,
  },

  section: {
    backgroundColor: '#FFFDF7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(208,212,197,0.70)',
    padding: 18,
    marginBottom: 10,
    shadowColor: '#104020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionNumBadge: {
    backgroundColor: '#F0F4E8',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  sectionNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#708040',
    letterSpacing: 1.6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#104020',
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontSize: 20,
    color: '#903020',
    lineHeight: 22,
    marginTop: -2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#52624A',
    lineHeight: 22,
  },
})
