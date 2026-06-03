import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useSupabaseClient } from '../lib/supabaseClient'

const C = {
  cream: '#F1EAD8',
  dark: '#1A0E0C',
  red: '#A8331F',
  tan: '#C2A172',
  mutedText: 'rgba(26,14,12,0.62)',
  dimText: 'rgba(26,14,12,0.40)',
  veryMuted: 'rgba(26,14,12,0.18)',
  divider: 'rgba(26,14,12,0.10)',
  white: '#FFFFFF',
  cardFill: '#FFF8E8',
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

export default function ReviewScreen({ route, navigation }: Props) {
  const { reportId, groundName } = route.params
  const { userId } = useAuth()
  const supabase = useSupabaseClient()

  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tossWon, setTossWon] = useState<'yes' | 'no' | null>(null)
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null)
  const [matchWon, setMatchWon] = useState<'yes' | 'no' | null>(null)
  const [actualParScore, setActualParScore] = useState('')
  const [pitchRating, setPitchRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  // Load existing review if one exists for this report
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('report_id', reportId)
        .maybeSingle()

      if (data) {
        setExistingReviewId(data.id)
        setTossWon(data.toss_won === true ? 'yes' : data.toss_won === false ? 'no' : null)
        setTossDecision(data.toss_decision ?? null)
        setMatchWon(data.match_won === true ? 'yes' : data.match_won === false ? 'no' : null)
        setActualParScore(data.actual_par_score != null ? String(data.actual_par_score) : '')
        setPitchRating(data.pitch_rating ?? null)
        setNotes(data.notes ?? '')
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
      const payload = {
        report_id: reportId,
        user_id: userId,
        toss_won: tossWon === 'yes' ? true : tossWon === 'no' ? false : null,
        toss_decision: tossDecision ?? null,
        match_won: matchWon === 'yes' ? true : matchWon === 'no' ? false : null,
        actual_par_score: actualParScore ? parseInt(actualParScore, 10) : null,
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
        const { error } = await supabase.from('reviews').insert(payload)
        if (error) throw error
      }

      Alert.alert(
        'Match result saved!',
        'Thanks for the feedback.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (err) {
      Alert.alert('Save failed', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

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
        <Text style={styles.headerTitle}>MATCH RESULT</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.headerDivider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>

          <Text style={styles.groundLabel}>{groundName}</Text>

          {/* Toss won */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Did you win the toss?</Text>
            <ToggleGroup<'yes' | 'no'>
              options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
              value={tossWon}
              onChange={setTossWon}
            />
          </View>

          {/* Toss decision */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Toss decision</Text>
            <ToggleGroup<'bat' | 'bowl'>
              options={[{ label: 'Bat', value: 'bat' }, { label: 'Bowl', value: 'bowl' }]}
              value={tossDecision}
              onChange={setTossDecision}
            />
          </View>

          {/* Match won */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Did you win the match?</Text>
            <ToggleGroup<'yes' | 'no'>
              options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
              value={matchWon}
              onChange={setMatchWon}
            />
          </View>

          {/* Actual par score */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Actual par score</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="e.g. 220"
                placeholderTextColor={C.dimText}
                value={actualParScore}
                onChangeText={setActualParScore}
              />
            </View>
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
  },
  backText: { fontSize: 22, color: C.dark, lineHeight: 28 },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: C.tan,
  },
  headerDivider: { height: 1, backgroundColor: C.divider },

  scroll: { padding: 20, paddingBottom: 40 },

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
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: C.cardFill,
    borderWidth: 1.5,
    borderColor: C.veryMuted,
  },
  toggleBtnActive: {
    backgroundColor: C.red,
    borderColor: C.red,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.mutedText,
  },
  toggleTextActive: { color: C.white },

  inputWrap: {
    backgroundColor: C.white,
    borderRadius: 10,
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
  starFilled: { color: C.tan },

  notesInput: {
    backgroundColor: C.white,
    borderRadius: 10,
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
    borderRadius: 14,
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
})
