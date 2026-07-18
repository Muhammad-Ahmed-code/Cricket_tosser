import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useSupabaseClient } from '../lib/supabaseClient'
import { track } from '../lib/analytics'
import { reportHistoryStore } from '../lib/reportHistoryStore'
import { cancelMatchReminderNotification } from '../lib/notificationService'

const C = {
  cream:     '#F7F2E8',
  dark:      '#104020',
  red:       '#903020',
  tan:       '#507020',
  mutedText: '#52624A',
  dimText:   'rgba(82,98,74,0.55)',
  veryMuted: 'rgba(208,212,197,0.55)',
  divider:   'rgba(208,212,197,0.60)',
  white:     '#FFFDF7',
  cardFill:  '#FFFDF7',
}

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.toggleRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.toggleBtn, value === opt.value && styles.toggleBtnActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.75}
        >
          <Text style={[styles.toggleText, value === opt.value && styles.toggleTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function deriveBattingOrder(
  tossWon: boolean | null,
  tossDecision: 'bat' | 'bowl' | null,
): 'user' | 'opposition' | null {
  if (tossWon === null || tossDecision === null) return null
  if (tossWon) return tossDecision === 'bat' ? 'user' : 'opposition'
  return tossDecision === 'bat' ? 'opposition' : 'user'
}

function ScorecardCard({
  inningsLabel,
  teamLabel,
  runs,
  onRunsChange,
  wickets,
  onWicketsChange,
  overs,
  onOversChange,
  onFocus,
}: {
  inningsLabel: string
  teamLabel: string | null
  runs: string
  onRunsChange: (v: string) => void
  wickets: string
  onWicketsChange: (v: string) => void
  overs: string
  onOversChange: (v: string) => void
  onFocus?: () => void
}) {
  return (
    <View style={styles.scorecardCard}>
      <View style={styles.scorecardHeader}>
        <Text style={styles.scorecardInningsTag}>{inningsLabel}</Text>
        {teamLabel && <Text style={styles.scorecardTeam}>{teamLabel}</Text>}
      </View>
      <View style={styles.scorecardRow}>
        <View style={styles.scorecardField}>
          <Text style={styles.scorecardFieldLabel}>Runs</Text>
          <View style={styles.scorecardInputWrap}>
            <TextInput
              style={styles.scorecardInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0"
              placeholderTextColor={C.dimText}
              value={runs}
              onChangeText={onRunsChange}
              onFocus={onFocus}
            />
          </View>
        </View>
        <View style={styles.scorecardField}>
          <Text style={styles.scorecardFieldLabel}>Wickets</Text>
          <View style={styles.scorecardInputWrap}>
            <TextInput
              style={styles.scorecardInput}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="0"
              placeholderTextColor={C.dimText}
              value={wickets}
              onChangeText={v => {
                if (v === '') { onWicketsChange(''); return }
                const n = parseInt(v, 10)
                if (!isNaN(n) && n >= 0 && n <= 10) onWicketsChange(String(n))
              }}
              onFocus={onFocus}
            />
          </View>
        </View>
        <View style={styles.scorecardField}>
          <Text style={styles.scorecardFieldLabel}>Overs</Text>
          <View style={styles.scorecardInputWrap}>
            <TextInput
              style={styles.scorecardInput}
              keyboardType="decimal-pad"
              maxLength={5}
              placeholder="0.0"
              placeholderTextColor={C.dimText}
              value={overs}
              onChangeText={onOversChange}
              onFocus={onFocus}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

export default function ReviewScreen({ route, navigation }: Props) {
  const { reportId, groundName } = route.params
  const { userId } = useAuth()
  const supabase = useSupabaseClient()

  const scrollViewRef = useRef<ScrollView>(null)
  const sectionOffsets = useRef<Record<string, number>>({})

  const scrollToSection = (key: string) => {
    const y = sectionOffsets.current[key]
    if (y != null) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true })
    }
  }

  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tossReportCompleted, setTossReportCompleted] = useState(false)
  const [tossWon, setTossWon] = useState<boolean | null>(null)
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null)
  // True when we're editing a previously submitted match result (vs first submission)
  const [isEditMode, setIsEditMode] = useState(false)

  // Stage 2 fields only — toss fields live in ReportScreen (Stage 1)
  const [matchWon, setMatchWon] = useState<'yes' | 'no' | null>(null)
  const [firstInningsRuns, setFirstInningsRuns] = useState('')
  const [firstInningsWickets, setFirstInningsWickets] = useState('')
  const [firstInningsOvers, setFirstInningsOvers] = useState('')
  const [secondInningsRuns, setSecondInningsRuns] = useState('')
  const [secondInningsWickets, setSecondInningsWickets] = useState('')
  const [secondInningsOvers, setSecondInningsOvers] = useState('')
  const [pitchRating, setPitchRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [supabaseResult, localEntries] = await Promise.all([
        supabase
          .from('reviews')
          .select(`
            id, toss_report_completed, toss_won, toss_decision,
            match_won, pitch_rating, notes,
            first_innings_runs, first_innings_wickets, first_innings_overs,
            second_innings_runs, second_innings_wickets, second_innings_overs
          `)
          .eq('report_id', reportId)
          .maybeSingle(),
        reportHistoryStore.getAll(),
      ])
      const data = supabaseResult.data
      const localEntry = localEntries.find(r => r.id === reportId)

      if (data) {
        setExistingReviewId(data.id)
        setTossReportCompleted(data.toss_report_completed ?? false)
        setTossWon(data.toss_won ?? null)
        setTossDecision(data.toss_decision ?? null)
        setMatchWon(data.match_won === true ? 'yes' : data.match_won === false ? 'no' : null)
        setPitchRating(data.pitch_rating ?? null)
        setNotes(data.notes ?? '')
        setFirstInningsRuns(data.first_innings_runs != null ? String(data.first_innings_runs) : '')
        setFirstInningsWickets(data.first_innings_wickets != null ? String(data.first_innings_wickets) : '')
        setFirstInningsOvers(data.first_innings_overs != null ? String(data.first_innings_overs) : '')
        setSecondInningsRuns(data.second_innings_runs != null ? String(data.second_innings_runs) : '')
        setSecondInningsWickets(data.second_innings_wickets != null ? String(data.second_innings_wickets) : '')
        setSecondInningsOvers(data.second_innings_overs != null ? String(data.second_innings_overs) : '')
        // Edit mode: local store was previously marked as completed (most reliable signal)
        setIsEditMode(localEntry?.match_completed === true)
      }
      setLoading(false)
    })()
  }, [reportId, supabase])

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'You must be signed in to save match results.')
      return
    }
    setSaving(true)
    try {
      const firstInningsTeam = deriveBattingOrder(tossWon, tossDecision)
      const payload = {
        match_won: matchWon === 'yes' ? true : matchWon === 'no' ? false : null,
        first_innings_runs: firstInningsRuns ? parseInt(firstInningsRuns, 10) : null,
        first_innings_wickets: firstInningsWickets ? parseInt(firstInningsWickets, 10) : null,
        first_innings_overs: firstInningsOvers ? parseFloat(firstInningsOvers) : null,
        second_innings_runs: secondInningsRuns ? parseInt(secondInningsRuns, 10) : null,
        second_innings_wickets: secondInningsWickets ? parseInt(secondInningsWickets, 10) : null,
        second_innings_overs: secondInningsOvers ? parseFloat(secondInningsOvers) : null,
        first_innings_team: firstInningsTeam,
        pitch_rating: pitchRating,
        notes: notes || null,
      }

      if (existingReviewId) {
        const { error } = await supabase
          .from('reviews')
          .update(payload)
          .eq('id', existingReviewId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('reviews').insert({
          ...payload,
          report_id: reportId,
          user_id: userId,
        })
        if (error) throw error
      }

      const matchResult = matchWon === 'yes' ? 'won' : matchWon === 'no' ? 'lost' : null
      track('match_report_completed', {
        ...(matchResult ? { match_result: matchResult } : {}),
        report_id: reportId,
        ...(firstInningsRuns ? { first_innings_runs: parseInt(firstInningsRuns, 10) } : {}),
        ...(secondInningsRuns ? { second_innings_runs: parseInt(secondInningsRuns, 10) } : {}),
        ...(firstInningsTeam ? { first_innings_team: firstInningsTeam } : {}),
      })
      reportHistoryStore.markMatchCompleted(reportId)
      cancelMatchReminderNotification(reportId)
      if (isEditMode) {
        navigation.goBack()
      } else {
        Alert.alert(
          'Match result saved!',
          'Thanks for the feedback.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        )
      }
    } catch {
      Alert.alert('Save failed', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const firstBattingTeam = deriveBattingOrder(tossWon, tossDecision)

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={C.red} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MATCH REPORT</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.headerDivider} />

      {/* Stage 1 not yet complete — locked state */}
      {!tossReportCompleted ? (
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>Complete Toss Report First</Text>
          <Text style={styles.lockedSub}>
            Go back to the report screen and fill in the Toss Report before adding match results.
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.goBackBtnText}>← Back to report</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >

            <Text style={styles.groundLabel}>{groundName}</Text>

            {/* Match won */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Did you win the match?</Text>
              <ToggleGroup<'yes' | 'no'>
                options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                value={matchWon}
                onChange={setMatchWon}
              />
            </View>

            {/* Innings scorecards */}
            <View onLayout={e => { sectionOffsets.current['first'] = e.nativeEvent.layout.y }}>
              <ScorecardCard
                inningsLabel="1ST INNINGS"
                teamLabel={
                  firstBattingTeam === 'user' ? 'Your Team'
                  : firstBattingTeam === 'opposition' ? 'Opposition'
                  : null
                }
                runs={firstInningsRuns}
                onRunsChange={setFirstInningsRuns}
                wickets={firstInningsWickets}
                onWicketsChange={setFirstInningsWickets}
                overs={firstInningsOvers}
                onOversChange={setFirstInningsOvers}
                onFocus={() => scrollToSection('first')}
              />
            </View>
            <View onLayout={e => { sectionOffsets.current['second'] = e.nativeEvent.layout.y }}>
              <ScorecardCard
                inningsLabel="2ND INNINGS"
                teamLabel={
                  firstBattingTeam === 'user' ? 'Opposition'
                  : firstBattingTeam === 'opposition' ? 'Your Team'
                  : null
                }
                runs={secondInningsRuns}
                onRunsChange={setSecondInningsRuns}
                wickets={secondInningsWickets}
                onWicketsChange={setSecondInningsWickets}
                overs={secondInningsOvers}
                onOversChange={setSecondInningsOvers}
                onFocus={() => scrollToSection('second')}
              />
            </View>

            {/* Pitch rating */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>How was the pitch?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setPitchRating(pitchRating === n ? null : n)}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Text style={[
                      styles.star,
                      (pitchRating ?? 0) >= n && styles.starFilled,
                    ]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={4}
                placeholder="How did the pitch play? Any surprises?"
                placeholderTextColor={C.dimText}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
                onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {existingReviewId ? 'Update match result' : 'Save match result'}
                </Text>
              )}
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#104020',
  },
  backText: { fontSize: 22, color: '#FFFDF7', lineHeight: 28 },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: 'rgba(247,242,232,0.80)',
  },
  headerDivider: { height: 1, backgroundColor: 'rgba(247,242,232,0.15)' },

  // Locked state
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  lockedIcon: { fontSize: 44, marginBottom: 4 },
  lockedTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.dark,
    textAlign: 'center',
  },
  lockedSub: {
    fontSize: 14,
    color: C.mutedText,
    textAlign: 'center',
    lineHeight: 21,
  },
  goBackBtn: {
    backgroundColor: C.dark,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 8,
  },
  goBackBtnText: { color: C.white, fontSize: 15, fontWeight: '600' },

  scroll: { padding: 20, paddingBottom: 120 },

  groundLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: C.dark,
    marginBottom: 24,
  },

  field: { marginBottom: 24 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.dark,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: C.cardFill,
    borderWidth: 1.5,
    borderColor: C.veryMuted,
  },
  toggleBtnActive: {
    backgroundColor: C.dark,
    borderColor: C.dark,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.mutedText,
  },
  toggleTextActive: { color: C.white },

  inputWrap: {
    backgroundColor: C.cardFill,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    fontSize: 15,
    color: C.dark,
    padding: 0,
  },

  starsRow: { flexDirection: 'row', gap: 8 },
  star: {
    fontSize: 34,
    color: C.veryMuted,
    lineHeight: 40,
  },
  starFilled: { color: C.red },

  notesInput: {
    backgroundColor: C.cardFill,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.dark,
    minHeight: 100,
    lineHeight: 20,
  },

  submitBtn: {
    backgroundColor: C.dark,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 58,
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  scorecardCard: {
    backgroundColor: C.cardFill,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.divider,
    padding: 14,
    marginBottom: 12,
  },
  scorecardHeader: {
    marginBottom: 12,
  },
  scorecardInningsTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.mutedText,
    marginBottom: 3,
  },
  scorecardTeam: {
    fontSize: 16,
    fontWeight: '700',
    color: C.dark,
  },
  scorecardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scorecardField: {
    flex: 1,
  },
  scorecardFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.mutedText,
    marginBottom: 6,
  },
  scorecardInputWrap: {
    backgroundColor: C.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.divider,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scorecardInput: {
    fontSize: 17,
    fontWeight: '600',
    color: C.dark,
    padding: 0,
    textAlign: 'center',
    width: '100%',
  },
})
