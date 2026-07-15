import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useAuth } from '@clerk/clerk-expo'
import {
  useFonts,
  PlusJakartaSans_800ExtraBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Inter_700Bold, Inter_600SemiBold, Inter_500Medium, Inter_400Regular } from '@expo-google-fonts/inter'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { optOutTracking, optInTracking, identifyUser } from '../lib/analytics'
import Svg, { Path } from 'react-native-svg'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

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
  lineLight:   'rgba(216,212,197,0.6)',
}

export default function SettingsScreen({ navigation }: Props) {
  const { userId } = useAuth()
  const [notificationsOn, setNotificationsOn] = useState(false)
  const [analyticsOn, setAnalyticsOn] = useState(false)

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    'PlusJakartaSans-Bold':      PlusJakartaSans_700Bold,
    'Inter-Bold':                Inter_700Bold,
    'Inter-SemiBold':            Inter_600SemiBold,
    'Inter-Medium':              Inter_500Medium,
    'Inter-Regular':             Inter_400Regular,
  })

  useEffect(() => {
    ;(async () => {
      const { status } = await Notifications.getPermissionsAsync()
      setNotificationsOn(status === 'granted')

      const stored = await AsyncStorage.getItem('analyticsEnabled')
      setAnalyticsOn(stored === 'true')
    })()
  }, [])

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      // Request permission
      const { status } = await Notifications.requestPermissionsAsync()
      setNotificationsOn(status === 'granted')
    } else {
      // Can't programmatically revoke — send user to device settings
      Alert.alert(
        'Turn off notifications',
        'To disable notifications, go to your device settings and turn off notifications for Cricket Tosser.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      )
    }
  }

  const handleAnalyticsToggle = async (value: boolean) => {
    setAnalyticsOn(value)
    if (value) {
      await AsyncStorage.setItem('analyticsEnabled', 'true')
      await optInTracking()
      if (userId) identifyUser(userId)
    } else {
      await AsyncStorage.setItem('analyticsEnabled', 'false')
      optOutTracking()
    }
  }

  if (!fontsLoaded) return null

  return (
    <SafeAreaView style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity
          style={st.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-6 6 6 6" stroke={C.forest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={st.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* NOTIFICATIONS */}
        <Text style={st.sectionLabel}>NOTIFICATIONS</Text>
        <View style={st.card}>
          <View style={st.row}>
            <View style={st.rowBody}>
              <Text style={st.rowTitle}>Match reminders</Text>
              <Text style={st.rowDesc}>Remind me to log my toss and match results</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: C.line, true: C.pitch }}
              thumbColor={C.paper}
            />
          </View>
        </View>

        {/* PRIVACY */}
        <Text style={[st.sectionLabel, { marginTop: 28 }]}>PRIVACY</Text>
        <View style={st.card}>
          <View style={st.row}>
            <View style={st.rowBody}>
              <Text style={st.rowTitle}>Analytics</Text>
              <Text style={st.rowDesc}>Anonymous usage data only. Never sold or shared.</Text>
            </View>
            <Switch
              value={analyticsOn}
              onValueChange={handleAnalyticsToggle}
              trackColor={{ false: C.line, true: C.pitch }}
              thumbColor={C.paper}
            />
          </View>

          <View style={st.divider} />

          <TouchableOpacity
            style={st.row}
            onPress={() => navigation.navigate('Privacy')}
            activeOpacity={0.7}
          >
            <Text style={[st.rowTitle, { flex: 1 }]}>Privacy Policy</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M9 6l6 6-6 6" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.cream },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.cream,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 18,
    color: C.textPrimary,
    letterSpacing: -0.2,
  },

  sectionLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: C.olive,
    marginBottom: 10,
    marginLeft: 4,
  },

  card: {
    backgroundColor: C.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: C.textPrimary,
    marginBottom: 3,
  },
  rowDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: C.textMuted,
  },

  divider: {
    height: 1,
    backgroundColor: C.lineLight,
    marginHorizontal: 16,
  },
})
