import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { theme } from '../theme'
import InsightModal from '../components/InsightModal'
import NavLogo from '../components/NavLogo'

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>

export default function ReportScreen({ route, navigation }: Props) {
  const { result, groundName, overs, squad } = route.params
  const prediction = result?.prediction ?? {}
  const weather = result?.weather ?? {}

  const {
    toss_decision,
    confidence,
    pitch_type,
    behaviour,
    par_score_min,
    par_score_max,
    toss_reasoning,
    selection_tip,
    weather_impact,
    key_signals = [],
    first_10_overs,
    last_10_overs,
    squad_rating,
    squad_verdict,
    squad_strengths = [],
    squad_weakness,
    squad_suggestion,
  } = prediction

  const {
    temp_celsius,
    humidity_percent,
    wind_kph,
    rain_last_48h_mm,
    conditions,
    drying_out,
    forecast_afternoon_temp,
  } = weather

  const tossLabel = toss_decision === 'bat' ? 'Bat first' : 'Bowl first'

  const confidenceLabel =
    confidence === 'high' ? '⚡ High confidence' :
    confidence === 'low' ? '? Low confidence' :
    '~ Medium confidence'

  const handleShare = () => {
    Share.share({
      message:
        `PitchReader — ${groundName}\n` +
        `Toss: ${tossLabel} (${confidence} confidence)\n` +
        `Par score: ${par_score_min}–${par_score_max} (${overs} overs)\n` +
        `Conditions: ${conditions}, ${temp_celsius}°C\n` +
        `${toss_reasoning}\n` +
        `Powered by PitchReader 🏏`,
    })
  }

  const handleFeedback = () => {
    Alert.alert('Coming soon', 'Post-match feedback will be added in the next update')
  }

  const [modal, setModal] = useState<{
    visible: boolean; title: string; content: string; icon: string; extraContext?: string
  }>({ visible: false, title: '', content: '', icon: '' })

  const openModal = (title: string, content: string, icon: string, extraContext?: string) =>
    setModal({ visible: true, title, content, icon, extraContext })

  const closeModal = () => setModal(m => ({ ...m, visible: false }))

  return (
    <SafeAreaView style={styles.root}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.navBack}>
          <Text style={styles.navBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <NavLogo />
          <Text style={styles.navSubtitle}>{groundName} · {overs} ov · just now</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.navShare}>
          <Text style={styles.navShareIcon}>📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Weather strip */}
        <View style={styles.weatherStrip}>
          <View style={styles.weatherRow}>
            {[
              { value: `${temp_celsius}°`, key: 'temp' },
              { value: conditions, key: 'conditions' },
              { value: `${humidity_percent}%`, key: 'humidity' },
              { value: `${wind_kph}kph`, key: 'wind' },
              { value: `${rain_last_48h_mm}mm`, key: 'rain 48h' },
            ].map((item, i) => (
              <View key={i} style={styles.weatherItem}>
                <Text style={styles.weatherValue} numberOfLines={1}>{item.value}</Text>
                <Text style={styles.weatherKey}>{item.key}</Text>
              </View>
            ))}
          </View>
          {drying_out && (
            <View style={styles.dryingBanner}>
              <Text style={styles.dryingBannerText}>
                ☀️ Pitch will dry and firm up this afternoon
              </Text>
            </View>
          )}
        </View>

        {/* Toss hero card */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.85}
          onPress={() => openModal(
            'Toss decision', toss_reasoning, '🪙',
            "The toss is one of the most important decisions in cricket. On a seam-friendly morning pitch, bowling first lets your seamers exploit conditions before the pitch flattens. On a batting track, batting first sets a target and avoids second innings pressure. Always factor in your team's strengths — if your best bowlers are seamers, a green pitch is gold."
          )}
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroDecision}>{tossLabel}</Text>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.heroPitchType}>{pitch_type}</Text>
              <Text style={styles.heroChevron}>›</Text>
            </View>
          </View>
          <Text style={styles.heroReasoning}>{toss_reasoning}</Text>
          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>{confidenceLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* Gradient strip */}
        <View style={styles.gradientStrip}>
          <View style={[styles.gradientSegment, { backgroundColor: theme.green.mid, width: '33%' }]} />
          <View style={[styles.gradientSegment, { backgroundColor: theme.sky, width: '33%' }]} />
          <View style={[styles.gradientSegment, { backgroundColor: theme.brown, width: '34%' }]} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.card, styles.statsCard]}
            activeOpacity={0.7}
            onPress={() => openModal(
              'Par score',
              `${par_score_min}–${par_score_max} runs in ${overs} overs`,
              '📊',
              'Par score is calculated based on the visible pitch surface, weather conditions, and match format. A seam-friendly pitch in damp conditions typically produces lower scores — batting is harder. A flat dry pitch in good weather produces higher scores. Use this as your target-setting anchor, not a hard ceiling — good batting can always exceed par.'
            )}
          >
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>Par score · {overs} ov</Text>
              <Text style={styles.cardChevron}>›</Text>
            </View>
            <Text style={styles.cardValue}>{par_score_min}–{par_score_max}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.statsCard]}
            activeOpacity={0.7}
            onPress={() => openModal(
              'Selection tip', selection_tip, '👥',
              'Team selection on match day should always factor in the pitch conditions. A seam-friendly surface rewards pace bowlers who can hit good lengths. A dry spinning track rewards finger spinners with flight and loop. Always pick your best player for the conditions — not just your best player overall.'
            )}
          >
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>Selection tip</Text>
              <Text style={styles.cardChevron}>›</Text>
            </View>
            <Text style={styles.cardValue} numberOfLines={2}>{selection_tip}</Text>
          </TouchableOpacity>
        </View>

        {/* Innings cards */}
        <TouchableOpacity
          style={[styles.card, styles.blockCard]}
          activeOpacity={0.7}
          onPress={() => openModal(
            'First 10 overs', first_10_overs, '🏏',
            'The first 10 overs set the tone of the entire match. New ball movement, early wickets, and powerplay scoring rates all stem from how the pitch plays initially. Use this insight to set your field and bowling plan before the game starts.'
          )}
        >
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardSectionLabel}>FIRST 10 OVERS</Text>
            <Text style={styles.cardChevron}>›</Text>
          </View>
          <Text style={styles.cardBodyText}>{first_10_overs}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.blockCard]}
          activeOpacity={0.7}
          onPress={() => openModal(
            'Last 10 overs', last_10_overs, '💥',
            'The death overs are where matches are won and lost. Knowing whether the pitch will deteriorate (variable bounce, turn, crumbling) or remain true helps you plan your bowling attack and batting lineup order. A deteriorating pitch means your best bowlers should be saved for the end.'
          )}
        >
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardSectionLabel}>LAST 10 OVERS</Text>
            <Text style={styles.cardChevron}>›</Text>
          </View>
          <Text style={styles.cardBodyText}>{last_10_overs}</Text>
        </TouchableOpacity>

        {/* Behaviour card */}
        <TouchableOpacity
          style={[styles.card, styles.blockCard]}
          activeOpacity={0.7}
          onPress={() => openModal(
            'How it will play', behaviour, '📋', weather_impact
          )}
        >
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardSectionLabel}>HOW IT WILL PLAY</Text>
            <Text style={styles.cardChevron}>›</Text>
          </View>
          <Text style={styles.cardBodyText}>{behaviour}</Text>
          <View style={styles.divider} />
          <Text style={styles.weatherImpactText}>{weather_impact}</Text>
        </TouchableOpacity>

        {/* Key signals */}
        <TouchableOpacity
          style={[styles.card, styles.blockCard]}
          activeOpacity={0.7}
          onPress={() => openModal(
            'What the AI saw',
            key_signals?.join('\n\n') ?? '',
            '👁',
            'These signals are what Claude Vision detected across all 4 photos. The close-up shots reveal surface texture, moisture, and cracks that full-length shots miss. The more photos you provide, the more accurate the read.'
          )}
        >
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardSectionLabel}>WHAT THE AI SAW ACROSS 4 PHOTOS</Text>
            <Text style={styles.cardChevron}>›</Text>
          </View>
          {key_signals.map((signal: string, i: number) => (
            <View key={i} style={styles.signalRow}>
              <Text style={styles.signalCheck}>✓</Text>
              <Text style={styles.signalText}>{signal}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {/* Squad card */}
        {squad_rating !== null && squad_rating !== undefined && (
          <TouchableOpacity
            style={styles.squadCard}
            onPress={() => {
              const pace = (squad?.seamers ?? 0) + (squad?.fastAllRounders ?? 0)
              const spin = (squad?.spinners ?? 0) + (squad?.spinAllRounders ?? 0)
              openModal(
                'Squad analysis',
                `${squad_verdict}\n\n` +
                `Pace options: ${pace} · Spin options: ${spin}\n\n` +
                `Strengths:\n${squad_strengths?.map((s: string) => `• ${s}`).join('\n')}\n\n` +
                `Key concern: ${squad_weakness}\n\n` +
                `Suggestion: ${squad_suggestion}`,
                '👥',
                'Knowing whether your all-rounders bowl pace or spin is crucial — a fast all-rounder on a green seamer is a bonus weapon, while a spin all-rounder on a dusty track can be your match-winner. This breakdown lets the AI give you a precise squad rating for the exact conditions.'
              )
            }}
            activeOpacity={0.85}
          >
            <View style={styles.squadHeader}>
              <Text style={styles.cardSectionLabel}>YOUR SQUAD FOR THIS PITCH</Text>
              <Text style={styles.chevron}>›</Text>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingCircle}>
                <Text style={styles.ratingNum}>{squad_rating}</Text>
                <Text style={styles.ratingDenom}>/10</Text>
              </View>
              <View style={styles.ratingRight}>
                <Text style={styles.squadVerdict}>{squad_verdict}</Text>
                {squad_suggestion && (
                  <View style={styles.suggestionPill}>
                    <Text style={styles.suggestionText}>
                      💡 {squad_suggestion}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {squad_strengths?.length > 0 && (
              <View style={styles.strengthsRow}>
                {squad_strengths.map((s: string, i: number) => (
                  <View key={i} style={styles.strengthPill}>
                    <Text style={styles.strengthText}>✓ {s}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Drying out warning */}
        {drying_out && (
          <View style={styles.dryingCard}>
            <Text style={styles.dryingCardText}>
              ☀️ This pitch will dry and firm up as the afternoon heats up to {forecast_afternoon_temp}°C. If batting first, expect the second innings to play easier — a good total here is crucial.
            </Text>
          </View>
        )}

        {/* Feedback button */}
        <TouchableOpacity style={styles.feedbackBtn} onPress={handleFeedback} activeOpacity={0.8}>
          <Text style={styles.feedbackBtnText}>After the match — how did it play? →</Text>
        </TouchableOpacity>

      </ScrollView>

      <InsightModal
        visible={modal.visible}
        onClose={closeModal}
        title={modal.title}
        content={modal.content}
        icon={modal.icon}
        extraContext={modal.extraContext}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.soil,
  },
  navBar: {
    backgroundColor: theme.green.dark,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBack: {
    padding: 4,
    marginRight: 8,
  },
  navBackText: {
    color: theme.white,
    fontSize: 22,
  },
  navCenter: {
    flex: 1,
  },
  navTitle: {
    color: theme.white,
    fontSize: 18,
    fontWeight: '500',
  },
  navSubtitle: {
    color: theme.green.light,
    fontSize: 11,
    marginTop: 2,
  },
  navShare: {
    padding: 4,
    marginLeft: 8,
  },
  navShareIcon: {
    fontSize: 20,
  },
  scroll: {
    padding: 14,
    paddingBottom: 40,
  },

  // Weather strip
  weatherStrip: {
    backgroundColor: theme.sky,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherItem: {
    alignItems: 'center',
    flex: 1,
  },
  weatherValue: {
    color: '#042C53',
    fontSize: 13,
    fontWeight: '500',
  },
  weatherKey: {
    color: theme.skyDark,
    fontSize: 9,
    marginTop: 2,
  },
  dryingBanner: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  dryingBannerText: {
    color: '#633806',
    fontSize: 12,
    textAlign: 'center',
  },

  // Toss hero card
  heroCard: {
    backgroundColor: theme.green.dark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroDecision: {
    color: theme.white,
    fontSize: 28,
    fontWeight: '500',
  },
  heroPitchType: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 8,
  },
  heroChevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
  },
  heroReasoning: {
    color: theme.green.light,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  confidencePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  confidenceText: {
    color: theme.white,
    fontSize: 11,
  },

  // Gradient strip
  gradientStrip: {
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gradientSegment: {
    height: '100%',
  },

  // Cards
  card: {
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.soilBorder,
    borderRadius: 10,
    padding: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statsCard: {
    flex: 1,
  },
  cardValue: {
    color: theme.text.mid,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardLabel: {
    color: theme.text.muted,
    fontSize: 11,
  },
  blockCard: {
    marginBottom: 8,
  },
  cardLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardChevron: {
    color: theme.text.muted,
    fontSize: 16,
    lineHeight: 20,
  },
  cardSectionLabel: {
    color: theme.text.label,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardBodyText: {
    color: theme.text.mid,
    fontSize: 13,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: theme.soilBorder,
    marginVertical: 10,
  },
  weatherImpactText: {
    color: theme.text.muted,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Signals
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 8,
  },
  signalCheck: {
    color: theme.green.mid,
    fontSize: 13,
    lineHeight: 18,
  },
  signalText: {
    color: theme.text.label,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },

  // Drying card
  dryingCard: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#F0C14B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  dryingCardText: {
    color: '#633806',
    fontSize: 13,
    lineHeight: 20,
  },

  // Squad card
  squadCard: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#d4c9b0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chevron: {
    color: theme.text.muted,
    fontSize: 16,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  ratingCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a3a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexShrink: 0,
  },
  ratingNum: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f5f0e8',
  },
  ratingDenom: {
    fontSize: 11,
    color: '#7ec87e',
    marginTop: 6,
  },
  ratingRight: { flex: 1 },
  squadVerdict: {
    fontSize: 13,
    color: '#3d2e1a',
    lineHeight: 19,
    marginBottom: 8,
  },
  suggestionPill: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#F0C14B',
    padding: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#633806',
    lineHeight: 17,
  },
  strengthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  strengthPill: {
    backgroundColor: '#E1F5EE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  strengthText: {
    fontSize: 11,
    color: '#085041',
  },

  // Feedback
  feedbackBtn: {
    backgroundColor: theme.brown,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  feedbackBtnText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: '500',
  },
})
