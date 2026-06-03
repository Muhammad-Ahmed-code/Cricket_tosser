import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useOAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { authStore } from '../lib/authStore'

// Required for OAuth redirect to complete in the in-app browser
WebBrowser.maybeCompleteAuthSession()

// Clerk dashboard setup for OAuth:
//   Google: Clerk Dashboard → User & Authentication → Social Connections → Google → Enable
//           Set Redirect URL in Google Cloud Console to Clerk's OAuth callback URL
//   Apple: Clerk Dashboard → User & Authentication → Social Connections → Apple → Enable
//          Requires Apple Developer account with Sign in with Apple capability
//          Set Redirect URL in Apple Developer to Clerk's OAuth callback URL

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
}

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>

export default function AuthScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false)

  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' })
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' })

  useEffect(() => {
    // Warm up the browser on Android for a faster OAuth launch
    if (Platform.OS === 'android') WebBrowser.warmUpAsync()
    return () => {
      if (Platform.OS === 'android') WebBrowser.coolDownAsync()
    }
  }, [])

  const handleOAuth = async (start: typeof startAppleFlow) => {
    setLoading(true)
    try {
      const redirectUrl = Linking.createURL('/')
      const { createdSessionId, setActive } = await start({ redirectUrl })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        // Clerk's isSignedIn update will cause AppNavigator to route to Home
        navigation.replace('Home')
      }
    } catch (err) {
      Alert.alert('Sign in failed', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueAnonymous = () => {
    authStore.setIsAnonymous(true)
    navigation.replace('Home')
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>

        {/* Cricket pitch illustration placeholder */}
        <View style={styles.iconArea}>
          <View style={styles.pitchShape}>
            <View style={styles.pitchLine} />
            <View style={styles.pitchCircle} />
            <View style={[styles.pitchLine, { marginTop: 8 }]} />
          </View>
          <Text style={styles.appName}>PitchReader</Text>
        </View>

        <Text style={styles.headline}>Know your pitch.{'\n'}Win the toss.</Text>
        <Text style={styles.subheadline}>
          Sign in to save your match history and analysis
        </Text>

        <View style={styles.buttons}>
          {/* Apple Sign In — shown on iOS only for native feel, OAuth works cross-platform */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnApple, loading && styles.btnDisabled]}
              onPress={() => handleOAuth(startAppleFlow)}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.btnTextLight}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.btn, styles.btnGoogle, loading && styles.btnDisabled]}
            onPress={() => handleOAuth(startGoogleFlow)}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.dark} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.btnTextDark}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.privacy}>Your data is private and never shared</Text>
      </View>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={handleContinueAnonymous}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Continue without account</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
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
  pitchShape: {
    width: 60,
    height: 90,
    backgroundColor: '#c8b98a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.tan,
  },
  pitchLine: {
    width: 42,
    height: 1.5,
    backgroundColor: C.white,
    opacity: 0.8,
  },
  pitchCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.white,
    opacity: 0.8,
    marginVertical: 6,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: C.dark,
    letterSpacing: 0.5,
  },

  headline: {
    fontSize: 34,
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
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    minHeight: 54,
  },
  btnApple: {
    backgroundColor: C.dark,
  },
  btnGoogle: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.veryMuted,
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
    color: C.red,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
})
