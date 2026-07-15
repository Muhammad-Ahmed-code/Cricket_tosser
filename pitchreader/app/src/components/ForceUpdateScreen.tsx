import React, { useEffect } from 'react'
import {
  BackHandler,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { theme } from '../theme'

interface Props {
  message: string
  storeUrl: string
  minVersion?: string
}

export default function ForceUpdateScreen({ message, storeUrl, minVersion }: Props) {
  const currentVersion =
    Constants.expoConfig?.version ??
    (Constants.manifest as { version?: string } | null)?.version ??
    '?'

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.root]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Image
            source={require('../../assets/images/app-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Update required</Text>
          <Text style={styles.subtitle}>{message}</Text>
          {minVersion ? (
            <Text style={styles.versionInfo}>
              You have v{currentVersion} — v{minVersion} or later is required
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { if (storeUrl) Linking.openURL(storeUrl) }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Update now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
    backgroundColor: theme.cream,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  versionInfo: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    opacity: 0.65,
    marginBottom: 36,
  },
  primaryBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radiusMd,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: theme.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})
