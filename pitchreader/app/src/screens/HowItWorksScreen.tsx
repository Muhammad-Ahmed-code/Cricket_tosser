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

type Props = NativeStackScreenProps<RootStackParamList, 'HowItWorks'>

const STEPS = [
  {
    emoji: '📸',
    title: 'Take pitch photos',
    body: "Head to the pitch before the match. Take up to 4 photos from different angles — end-on, side-on, close-up of the surface, and the bowlers' run-up area. More angles = better analysis.",
  },
  {
    emoji: '📍',
    title: 'Select your ground',
    body: 'Search for your ground by name or let the app use your location. Ground data helps Cricket Tosser factor in local pitch history.',
  },
  {
    emoji: '🏏',
    title: 'Set match format & squad',
    body: 'Choose your format (T20, ODI, etc.) and optionally enter your squad breakdown — seamers, spinners, all-rounders. This unlocks squad-specific advice in the report.',
  },
  {
    emoji: '🤖',
    title: 'Cricket Tosser analyses the pitch',
    body: "Cricket Tosser reads the pitch surface, factors in live weather, ground history, and your squad, then generates a full captain's report in seconds.",
  },
  {
    emoji: '🪙',
    title: 'Log your toss result',
    body: 'After the toss, come back and log whether you won, what was chosen, and what you would have done. This unlocks the match result stage.',
  },
  {
    emoji: '📋',
    title: 'Log the match result',
    body: 'After the match, log the innings scores — runs, wickets, overs for both teams. This builds your personal match history and improves future analysis.',
  },
  {
    emoji: '📊',
    title: 'Track your history',
    body: 'Every report and result is saved. Head to Report History to see all your past analyses, fill in any pending toss or match results, and track your record.',
  },
]

const PHOTO_TIPS = [
  'Stand at the batting crease end, shoot down the length of the pitch',
  'Get low — knee height gives the best surface angle',
  'Include both ends in your photo set',
  'Take a close-up of the surface texture and any cracks',
  'Avoid strong shadows across the pitch if possible',
]

export default function HowItWorksScreen({ navigation }: Props) {
  useEffect(() => {
    track('how_it_works_opened')
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
        <Text style={st.headerTitle}>HOW IT WORKS</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={st.headerDivider} />

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {STEPS.map((step, i) => (
          <View key={i} style={st.card}>
            <View style={st.cardTop}>
              <View style={st.stepBadge}>
                <Text style={st.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={st.stepEmoji}>{step.emoji}</Text>
            </View>
            <Text style={st.stepTitle}>{step.title}</Text>
            <Text style={st.stepBody}>{step.body}</Text>
          </View>
        ))}

        <View style={[st.card, st.tipsCard]}>
          <Text style={st.tipsHeading}>📸  Tips for better pitch photos</Text>
          <View style={st.tipsDivider} />
          {PHOTO_TIPS.map((tip, i) => (
            <View key={i} style={st.tipRow}>
              <Text style={st.tipBullet}>·</Text>
              <Text style={st.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
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
    paddingBottom: 32,
    gap: 12,
  },

  card: {
    backgroundColor: '#FFFDF7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(208,212,197,0.70)',
    padding: 18,
    shadowColor: '#104020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepBadge: {
    backgroundColor: '#F0F4E8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#708040',
    letterSpacing: 1.6,
  },
  stepEmoji: {
    fontSize: 26,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#104020',
    marginBottom: 6,
  },
  stepBody: {
    fontSize: 14,
    fontWeight: '400',
    color: '#52624A',
    lineHeight: 22,
  },

  tipsCard: {
    marginTop: 4,
    padding: 0,
    overflow: 'hidden',
  },
  tipsHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#104020',
    padding: 18,
    paddingBottom: 14,
  },
  tipsDivider: {
    height: 1,
    backgroundColor: 'rgba(208,212,197,0.60)',
    marginHorizontal: 0,
  },
  tipRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 9,
    gap: 10,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(208,212,197,0.35)',
  },
  tipBullet: {
    fontSize: 20,
    color: '#903020',
    lineHeight: 22,
    marginTop: -2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#52624A',
    lineHeight: 22,
  },
})
