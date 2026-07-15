import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  LayoutAnimation,
  KeyboardAvoidingView,
  ScrollView,
  UIManager,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useSSO, useSignUp, useSignIn } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { authStore } from '../lib/authStore'
import { track } from '../lib/analytics'

WebBrowser.maybeCompleteAuthSession()

// LayoutAnimation requires this flag on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const C = {
  cream:     '#F7F2E8',
  dark:      '#104020',
  red:       '#903020',
  tan:       '#507020',
  mutedText: '#52624A',
  dimText:   'rgba(82,98,74,0.65)',
  veryMuted: 'rgba(208,212,197,0.60)',
  divider:   'rgba(208,212,197,0.40)',
  white:     '#FFFDF7',
}

type AuthMode = 'signin' | 'signup'
type EmailStep = 'form' | 'verify_otp' | 'reset_code'

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>

export default function AuthScreen({ navigation }: Props) {
  const [activeOAuth, setActiveOAuth] = useState<'apple' | 'google' | null>(null)

  const { startSSOFlow } = useSSO()

  const { isLoaded: signUpLoaded, signUp, setActive: signUpSetActive } = useSignUp()
  const { isLoaded: signInLoaded, signIn, setActive: signInSetActive } = useSignIn()

  // Email form state
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [emailStep, setEmailStep] = useState<EmailStep>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'android') WebBrowser.warmUpAsync()
    return () => {
      if (Platform.OS === 'android') WebBrowser.coolDownAsync()
    }
  }, [])

  const oauthLoading = activeOAuth !== null
  const anyLoading = oauthLoading || emailLoading

  // ── OAuth ────────────────────────────────────────────────────────────────

  const handleOAuth = async (strategy: 'oauth_apple' | 'oauth_google', method: 'apple' | 'google') => {
    setActiveOAuth(method)
    try {
      const redirectUrl = Linking.createURL('oauth-native-callback')
      const { createdSessionId, setActive, signUp: oauthSignUp } = await startSSOFlow({ strategy, redirectUrl })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        if (oauthSignUp?.status === 'complete') {
          track('sign_up_completed', { sign_up_method: method, platform: Platform.OS })
        }
        navigation.replace('Home')
      } else {
        Alert.alert('Sign in failed', 'Please try again.')
      }
    } catch (err) {
      console.error('[OAuth] error', err)
      Alert.alert('Sign in failed', 'Please try again.')
    } finally {
      setActiveOAuth(null)
    }
  }

  // ── Email form helpers ───────────────────────────────────────────────────

  const expandEmail = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setEmailExpanded(true)
  }

  const collapseEmail = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setEmailExpanded(false)
    setEmailStep('form')
    setPassword('')
    setConfirmPassword('')
    setOtp('')
    setResetCode('')
    setNewPassword('')
  }

  const switchAuthMode = () => {
    setAuthMode(m => (m === 'signin' ? 'signup' : 'signin'))
    setEmailStep('form')
    setPassword('')
    setConfirmPassword('')
    setOtp('')
  }

  // ── Email sign-up ────────────────────────────────────────────────────────

  const handleEmailSignUp = async () => {
    if (!signUpLoaded || !signUp) return
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", 'Please check your passwords.')
      return
    }
    setEmailLoading(true)
    try {
      await signUp.create({ emailAddress: email.trim(), password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setEmailStep('verify_otp')
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? 'Sign up failed. Please try again.'
      Alert.alert('Sign up failed', msg)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!signUpLoaded || !signUp) return
    if (otp.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code from your email.')
      return
    }
    setEmailLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp })
      if (result.status === 'complete' && signUpSetActive) {
        await signUpSetActive({ session: result.createdSessionId })
        track('sign_up_completed', { sign_up_method: 'email', platform: Platform.OS })
        navigation.replace('Home')
      } else {
        Alert.alert('Verification failed', 'Please check the code and try again.')
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? 'Verification failed.'
      Alert.alert('Verification failed', msg)
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Email sign-in ────────────────────────────────────────────────────────

  const handleEmailSignIn = async () => {
    if (!signInLoaded || !signIn) return
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    setEmailLoading(true)
    try {
      const result = await signIn.create({ identifier: email.trim(), password })
      if (result.status === 'complete' && signInSetActive) {
        await signInSetActive({ session: result.createdSessionId })
        navigation.replace('Home')
      } else {
        Alert.alert('Sign in failed', 'Please try again.')
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? 'Sign in failed. Please try again.'
      Alert.alert('Sign in failed', msg)
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Forgot password ──────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    if (!signInLoaded || !signIn) return
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address first.')
      return
    }
    setEmailLoading(true)
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() })
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setEmailStep('reset_code')
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? 'Failed to send reset email.'
      Alert.alert('Error', msg)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!signInLoaded || !signIn) return
    if (!resetCode || !newPassword) {
      Alert.alert('Missing fields', 'Please enter the code and your new password.')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }
    setEmailLoading(true)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
        password: newPassword,
      })
      if (result.status === 'complete' && signInSetActive) {
        await signInSetActive({ session: result.createdSessionId })
        navigation.replace('Home')
      } else {
        Alert.alert('Reset failed', 'Please try again.')
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? 'Password reset failed.'
      Alert.alert('Reset failed', msg)
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Anonymous ────────────────────────────────────────────────────────────

  const handleContinueAnonymous = () => {
    authStore.setIsAnonymous(true)
    navigation.replace('Home')
  }

  // ── Inline email form renderer ───────────────────────────────────────────

  const renderEmailSection = () => {
    if (!emailExpanded) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.btnEmail, anyLoading && styles.btnDisabled]}
          onPress={expandEmail}
          disabled={anyLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.emailIcon}>@</Text>
          <Text style={styles.btnTextDark}>Continue with Email</Text>
        </TouchableOpacity>
      )
    }

    if (emailStep === 'verify_otp') {
      return (
        <View style={styles.emailForm}>
          <Text style={styles.formTitle}>Check your email</Text>
          <Text style={styles.formSubtitle}>
            Enter the 6-digit code sent to {email}
          </Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="000000"
            placeholderTextColor={C.dimText}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnSubmit, emailLoading && styles.btnDisabled]}
            onPress={handleVerifyOtp}
            disabled={emailLoading}
            activeOpacity={0.85}
          >
            {emailLoading
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.btnTextLight}>Verify Code</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEmailStep('form'); setOtp('') }} activeOpacity={0.7} style={styles.backLink}>
            <Text style={styles.linkText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (emailStep === 'reset_code') {
      return (
        <View style={styles.emailForm}>
          <Text style={styles.formTitle}>Reset password</Text>
          <Text style={styles.formSubtitle}>
            Enter the code sent to {email} and choose a new password.
          </Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="000000"
            placeholderTextColor={C.dimText}
            value={resetCode}
            onChangeText={setResetCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="New password"
              placeholderTextColor={C.dimText}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNewPassword(v => !v)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.eyeText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.btn, styles.btnSubmit, emailLoading && styles.btnDisabled]}
            onPress={handleResetPassword}
            disabled={emailLoading}
            activeOpacity={0.85}
          >
            {emailLoading
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.btnTextLight}>Set New Password</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEmailStep('form'); setResetCode(''); setNewPassword('') }} activeOpacity={0.7} style={styles.backLink}>
            <Text style={styles.linkText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )
    }

    // Default: 'form'
    return (
      <View style={styles.emailForm}>
        <TouchableOpacity onPress={collapseEmail} activeOpacity={0.7} style={styles.backLink}>
          <Text style={styles.linkText}>← Back to sign-in options</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={C.dimText}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="Password"
            placeholderTextColor={C.dimText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {authMode === 'signup' && (
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Confirm Password"
              placeholderTextColor={C.dimText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.eyeText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {authMode === 'signin' && (
          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={emailLoading}
            activeOpacity={0.7}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.btn, styles.btnSubmit, emailLoading && styles.btnDisabled]}
          onPress={authMode === 'signup' ? handleEmailSignUp : handleEmailSignIn}
          disabled={emailLoading}
          activeOpacity={0.85}
        >
          {emailLoading
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.btnTextLight}>{authMode === 'signup' ? 'Create Account' : 'Sign In'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={switchAuthMode} activeOpacity={0.7} style={styles.switchRow}>
          <Text style={styles.linkText}>
            {authMode === 'signup'
              ? 'Already have an account? Sign in'
              : 'New here? Create account'
            }
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.iconArea}>
              <Image
                source={require('../../assets/Cricket_Tosser_Logo-removebg (3).png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.headline}>Know your pitch.{'\n'}Own the toss.</Text>
            <Text style={styles.subheadline}>
              Sign in to save your match history and analysis
            </Text>

            <View style={styles.buttons}>
              {/* Apple — iOS only, must be first per App Store guidelines */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnApple, anyLoading && styles.btnDisabled]}
                  onPress={() => handleOAuth('oauth_apple', 'apple')}
                  disabled={anyLoading}
                  activeOpacity={0.85}
                >
                  {activeOAuth === 'apple' ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <>
                      <Text style={styles.appleIcon}></Text>
                      <Text style={styles.btnTextLight}>Continue with Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Google */}
              <TouchableOpacity
                style={[styles.btn, styles.btnGoogle, anyLoading && styles.btnDisabled]}
                onPress={() => handleOAuth('oauth_google', 'google')}
                disabled={anyLoading}
                activeOpacity={0.85}
              >
                {activeOAuth === 'google' ? (
                  <ActivityIndicator color={C.dark} />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.btnTextDark}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email — button or inline form */}
              {renderEmailSection()}
            </View>

            <Text style={styles.privacy}>We analyse pitches, not people.</Text>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleContinueAnonymous}
            disabled={anyLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Continue without account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 48,
  },

  iconArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 180,
    height: 180,
  },

  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: C.dark,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 15,
    color: C.mutedText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },

  buttons: {
    alignSelf: 'stretch',
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    minHeight: 52,
  },
  btnApple: {
    backgroundColor: C.dark,
  },
  btnGoogle: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.veryMuted,
  },
  btnEmail: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.veryMuted,
  },
  btnSubmit: {
    backgroundColor: C.dark,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  appleIcon: {
    fontSize: 18,
    color: C.white,
    lineHeight: 22,
  },
  googleIcon: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: 22,
  },
  emailIcon: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: 22,
  },
  btnTextLight: {
    fontSize: 16,
    fontWeight: '600',
    color: C.white,
  },
  btnTextDark: {
    fontSize: 16,
    fontWeight: '600',
    color: C.dark,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.divider,
  },
  dividerText: {
    fontSize: 13,
    color: C.dimText,
    fontWeight: '500',
  },

  // Email form
  emailForm: {
    gap: 10,
    paddingTop: 4,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.dark,
    textAlign: 'center',
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 13,
    color: C.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  input: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.veryMuted,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: C.dark,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 6,
    fontWeight: '600',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  inputFlex: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeBtn: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderColor: C.veryMuted,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 13,
    color: C.mutedText,
    fontWeight: '500',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: C.tan,
    fontWeight: '500',
  },
  switchRow: {
    alignItems: 'center',
    paddingTop: 2,
  },
  backLink: {
    paddingBottom: 2,
  },
  linkText: {
    fontSize: 13,
    color: C.mutedText,
    fontWeight: '500',
    textAlign: 'center',
  },

  privacy: {
    fontSize: 12,
    color: C.dimText,
    textAlign: 'center',
    marginTop: 4,
  },

  skipBtn: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  skipText: {
    fontSize: 14,
    color: '#52624A',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
})
