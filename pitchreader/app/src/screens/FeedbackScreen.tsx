import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useSupabaseClient } from '../lib/supabaseClient'
import { track } from '../lib/analytics'

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>

const RATING_LABELS: Record<number, string> = {
  1: 'Not good',
  2: 'Could be better',
  3: "It's okay",
  4: 'Pretty good',
  5: 'Love it!',
}

const APP_VERSION =
  Constants.expoConfig?.version ??
  (Constants.manifest as { version?: string } | null)?.version ??
  '1.0.0'

export default function FeedbackScreen({ navigation }: Props) {
  const { userId } = useAuth()
  const supabase = useSupabaseClient()

  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    track('feedback_screen_opened')
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [])

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return
    Keyboard.dismiss()
    setSubmitting(true)
    setError(null)

    const { error: dbError } = await supabase.from('feedback').insert({
      user_id:     userId ?? null,
      rating,
      message:     message.trim(),
      app_version: APP_VERSION,
      platform:    Platform.OS,
    })

    if (dbError) {
      setSubmitting(false)
      setError('Something went wrong. Please try again.')
      return
    }

    track('feedback_submitted', {
      rating,
      has_message: message.trim().length > 0,
      platform: Platform.OS,
    })

    setSubmitting(false)
    setSuccess(true)
    successTimer.current = setTimeout(() => navigation.goBack(), 2000)
  }

  const canSubmit = rating > 0 && !submitting && !success

  return (
    <SafeAreaView style={st.root}>
      <View style={st.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={submitting}
        >
          <Text style={st.backText}>←</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>SEND FEEDBACK</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={st.headerDivider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={st.hero}>
            <Text style={st.heroTitle}>Send Feedback</Text>
            <Text style={st.heroSubtitle}>We read every message 🏏</Text>
          </View>

          {/* Rating */}
          <View style={st.card}>
            <Text style={st.fieldLabel}>How would you rate Cricket Tosser?</Text>
            <View style={st.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[st.star, star <= rating && st.starFilled]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={st.ratingLabel}>{RATING_LABELS[rating]}</Text>
            )}
          </View>

          {/* Message */}
          <View style={st.card}>
            <Text style={st.fieldLabel}>Anything else to share? <Text style={st.fieldLabelMuted}>(optional)</Text></Text>
            <TextInput
              style={st.textInput}
              multiline
              placeholder="Tell us what you think, report a bug, or suggest a feature..."
              placeholderTextColor="#9AA18C"
              value={message}
              onChangeText={t => setMessage(t.slice(0, 1000))}
              maxLength={1000}
              textAlignVertical="top"
              scrollEnabled={false}
            />
            <Text style={st.charCount}>{message.length}/1000</Text>
          </View>

          {/* Error */}
          {error && (
            <View style={st.errorBox}>
              <Text style={st.errorText}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {success && (
            <View style={st.successBox}>
              <Text style={st.successText}>Thanks for your feedback! 🙏</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[st.submitBtn, !canSubmit && st.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFDF7" size="small" />
            ) : (
              <Text style={[st.submitText, !canSubmit && st.submitTextDisabled]}>
                Send feedback
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 12,
  },

  hero: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#104020',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#52624A',
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

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#104020',
    marginBottom: 14,
  },
  fieldLabelMuted: {
    fontWeight: '400',
    color: '#9AA18C',
  },

  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  star: {
    fontSize: 40,
    color: '#D8D4C5',
  },
  starFilled: {
    color: '#903020',
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#903020',
    marginTop: 2,
  },

  textInput: {
    minHeight: 120,
    maxHeight: 300,
    fontSize: 14,
    fontWeight: '400',
    color: '#14351F',
    lineHeight: 22,
    padding: 0,
    paddingTop: 2,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9AA18C',
    textAlign: 'right',
    marginTop: 8,
  },

  errorBox: {
    backgroundColor: '#FEF0EE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(144,48,32,0.25)',
    padding: 14,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#903020',
    lineHeight: 20,
  },

  successBox: {
    backgroundColor: '#EDF5E8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(80,112,32,0.25)',
    padding: 14,
  },
  successText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#104020',
    textAlign: 'center',
  },

  submitBtn: {
    backgroundColor: '#903020',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#903020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(208,212,197,0.55)',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFDF7',
    letterSpacing: 0.3,
  },
  submitTextDisabled: {
    color: '#9AA18C',
  },
})
