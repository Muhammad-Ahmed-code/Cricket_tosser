import { Component, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import * as Linking from 'expo-linking'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import * as SecureStore from 'expo-secure-store'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import HomeScreen from './src/screens/HomeScreen'
import CameraScreen from './src/screens/CameraScreen'
import AnalysingScreen from './src/screens/AnalysingScreen'
import ReportScreen from './src/screens/ReportScreen'
import GroundSearchScreen from './src/screens/GroundSearchScreen'
import PhotoPickerScreen from './src/screens/PhotoPickerScreen'
import SplashScreenView from './src/screens/SplashScreenView'
import PaywallScreen from './src/screens/PaywallScreen'
import AuthScreen from './src/screens/AuthScreen'
import HistoryScreen from './src/screens/HistoryScreen'
import ReviewScreen from './src/screens/ReviewScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import HowItWorksScreen from './src/screens/HowItWorksScreen'
import PrivacyScreen from './src/screens/PrivacyScreen'
import FeedbackScreen from './src/screens/FeedbackScreen'
import PermissionsScreen from './src/screens/PermissionsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import TossReminderModal from './src/components/TossReminderModal'
import MatchReminderModal from './src/components/MatchReminderModal'
import ForceUpdateScreen from './src/components/ForceUpdateScreen'
import OfflineScreen from './src/components/OfflineScreen'
import { OfflineContext } from './src/lib/offlineContext'
import { usageStore } from './src/lib/usageStore'
import { authStore } from './src/lib/authStore'
import { configurePurchases } from './src/lib/purchases'
import { usePurchases } from './src/lib/usePurchases'
import { reportHistoryStore } from './src/lib/reportHistoryStore'
import {
  checkShouldShowInAppReminder,
  suppressInAppReminderFor24h,
  checkShouldShowMatchReminder,
  suppressMatchReminderFor24h,
  type InAppReminderData,
  type InAppMatchReminderData,
} from './src/lib/notificationService'
import {
  initMixpanel,
  identifyUser,
  resetUser,
  track,
  registerSuperProperties,
} from './src/lib/analytics'
import { checkForUpdate, type UpdateCheckResult } from './src/lib/updateCheck'

SplashScreen.preventAutoHideAsync()

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key) },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value) },
  async clearToken(key: string) { return SecureStore.deleteItemAsync(key) },
}

class ClerkErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(e: unknown) { console.warn('ClerkProvider error:', e) }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Authentication unavailable. Please restart the app.</Text>
        </View>
      )
    }
    return this.props.children
  }
}

export type RootStackParamList = {
  Offline: undefined
  Permissions: undefined
  Auth: undefined
  Home: { photoBase64?: string; slotIndex?: number } | undefined
  Camera: { slotIndex: number }
  PhotoPicker: { slotIndex: number }
  Analysing: {
    photos: string[]
    groundName: string
    overs: number
    lat: number
    lng: number
    squad?: { seamers: number; fastAllRounders: number; spinners: number; spinAllRounders: number; batters: number } | null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Report: { result: any; teamResult?: any | null; groundName: string; overs: number; squad?: { seamers: number; fastAllRounders: number; spinners: number; spinAllRounders: number; batters: number } | null; reportId?: string; scrollToToss?: boolean; scrollToMatch?: boolean }
  GroundSearch: { currentLocationName?: string; currentLat?: number; currentLng?: number }
  Paywall: { trigger?: 'limit_reached' | 'voluntary' | 'restore' } | undefined
  History: undefined
  Review: { reportId: string; groundName: string }
  Profile: undefined
  HowItWorks: undefined
  Privacy: undefined
  Feedback: undefined
  Settings: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const isExpoGo = Constants.appOwnership === 'expo'

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

const linking = {
  prefixes: [Linking.createURL('')],
}

async function navigateToReportFromNotification(reportId: string) {
  try {
    const entries = await reportHistoryStore.getAll()
    const report = entries.find(e => e.id === reportId)
    if (!report || !navigationRef.isReady()) return

    navigationRef.navigate('Report', {
      result: { prediction: report.prediction, weather: report.weather },
      groundName: report.ground_name,
      overs: report.overs,
      squad: null,
      reportId: report.id.startsWith('local_') ? undefined : report.id,
      scrollToToss: true,
    })
  } catch {
    // non-fatal
  }
}

async function navigateToReportFromMatchNotification(reportId: string) {
  try {
    const entries = await reportHistoryStore.getAll()
    const report = entries.find(e => e.id === reportId)
    if (!report || !navigationRef.isReady()) return

    navigationRef.navigate('Report', {
      result: { prediction: report.prediction, weather: report.weather },
      groundName: report.ground_name,
      overs: report.overs,
      squad: null,
      reportId: report.id.startsWith('local_') ? undefined : report.id,
      scrollToMatch: true,
    })
  } catch {
    // non-fatal
  }
}

function OfflineScreenWrapper({ navigation }: NativeStackScreenProps<RootStackParamList, 'Offline'>) {
  const { setIsOffline } = useContext(OfflineContext)
  return (
    <OfflineScreen
      onBackOnline={() => setIsOffline(false)}
      onViewHistory={() => navigation.navigate('History')}
    />
  )
}

function AppNavigator({ isOffline, setIsOffline }: { isOffline: boolean; setIsOffline: (v: boolean) => void }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [isAnonymous, setIsAnonymous] = useState(authStore.getIsAnonymous())
  const [hasSeenPermissions, setHasSeenPermissions] = useState<boolean | null>(null)
  usePurchases()

  useEffect(() => {
    AsyncStorage.getItem('has_seen_permissions').then(val => {
      setHasSeenPermissions(val === 'true')
    })
  }, [])

  const [reminderData, setReminderData] = useState<InAppReminderData | null>(null)
  const [matchReminderData, setMatchReminderData] = useState<InAppMatchReminderData | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const prevUserIdRef = useRef<string | null | undefined>(undefined)
  const prevIsOfflineRef = useRef(false)

  useEffect(() => {
    return authStore.subscribe(() => setIsAnonymous(authStore.getIsAnonymous()))
  }, [])

  // Identify on login / app re-open; reset on sign-out
  useEffect(() => {
    if (!isLoaded) return
    if (prevUserIdRef.current === userId) return
    const previousUserId = prevUserIdRef.current
    prevUserIdRef.current = userId
    if (userId) {
      identifyUser(userId)
      registerSuperProperties({ is_subscriber: usageStore.getIsSubscribed() })
    } else if (previousUserId !== undefined && previousUserId !== null) {
      resetUser()
    }
  }, [userId, isLoaded])

  // Keep is_subscriber super-property in sync when subscription changes
  useEffect(() => {
    return usageStore.subscribe(() => {
      registerSuperProperties({ is_subscriber: usageStore.getIsSubscribed() })
    })
  }, [])

  // Handle notification tap (foreground + background)
  useEffect(() => {
    if (isExpoGo) return
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>
      if (typeof data?.reportId !== 'string') return
      if (data.type === 'toss_reminder') {
        track('notification_tapped', { type: 'toss_reminder' })
        navigateToReportFromNotification(data.reportId)
      } else if (data.type === 'match_reminder') {
        track('notification_tapped', { type: 'match_reminder' })
        navigateToReportFromMatchNotification(data.reportId)
      }
    })
    return () => sub.remove()
  }, [])

  // Handle notification tap that cold-started the app
  useEffect(() => {
    if (isExpoGo) return
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return
      const data = response.notification.request.content.data as Record<string, unknown>
      if (typeof data?.reportId !== 'string') return
      if (data.type === 'toss_reminder') {
        track('notification_tapped', { type: 'toss_reminder' })
        setTimeout(() => navigateToReportFromNotification(data.reportId as string), 800)
      } else if (data.type === 'match_reminder') {
        track('notification_tapped', { type: 'match_reminder' })
        setTimeout(() => navigateToReportFromMatchNotification(data.reportId as string), 800)
      }
    })
  }, [])

  // In-app popup: check on every foreground transition — toss reminder takes priority
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const wasBackground = appStateRef.current !== 'active'
      appStateRef.current = nextState
      if (nextState !== 'active' || !wasBackground) return

      const result = await checkShouldShowInAppReminder()
      if (result.show) {
        setReminderData(result)
        return
      }

      const matchResult = await checkShouldShowMatchReminder()
      if (matchResult.show) setMatchReminderData(matchResult)
    }

    const sub = AppState.addEventListener('change', handleAppStateChange)
    return () => sub.remove()
  }, [])

  // Handle offline/online navigation transitions
  useEffect(() => {
    if (!navigationRef.isReady()) return

    if (isOffline && !prevIsOfflineRef.current) {
      // Just went offline — if user was on History or Report, preserve that screen
      // on top of the Offline root so the back button correctly returns to Offline.
      const route = navigationRef.getCurrentRoute()
      if (route?.name === 'History' || route?.name === 'Report') {
        const routeName = route.name as 'History' | 'Report'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params = route.params as any
        setTimeout(() => {
          if (!navigationRef.isReady()) return
          navigationRef.reset({
            index: 1,
            routes: [{ name: 'Offline' }, { name: routeName, params }],
          })
        }, 300)
      }
    } else if (!isOffline && prevIsOfflineRef.current) {
      // Just came back online — navigate to the correct entry screen
      if (hasSeenPermissions === null || !isLoaded) return
      const target: keyof RootStackParamList = !hasSeenPermissions
        ? 'Permissions'
        : (isSignedIn || isAnonymous ? 'Home' : 'Auth')
      setTimeout(() => {
        if (!navigationRef.isReady()) return
        navigationRef.reset({ index: 0, routes: [{ name: target }] })
      }, 100)
    }

    prevIsOfflineRef.current = isOffline
  }, [isOffline, hasSeenPermissions, isLoaded, isSignedIn, isAnonymous])

  if (!isLoaded || hasSeenPermissions === null) return null

  const initialRoute: keyof RootStackParamList = !hasSeenPermissions
    ? 'Permissions'
    : (isSignedIn || isAnonymous ? 'Home' : 'Auth')

  const handleReminderLogNow = () => {
    if (!reminderData) return
    const data = reminderData
    setReminderData(null)
    if (!navigationRef.isReady()) return
    navigationRef.navigate('Report', {
      result: { prediction: data.prediction, weather: data.weather },
      groundName: data.groundName,
      overs: data.overs,
      squad: null,
      reportId: data.reportId.startsWith('local_') ? undefined : data.reportId,
      scrollToToss: true,
    })
  }

  const handleReminderLater = async () => {
    setReminderData(null)
    await suppressInAppReminderFor24h()
  }

  const handleMatchReminderLogNow = () => {
    if (!matchReminderData) return
    const data = matchReminderData
    setMatchReminderData(null)
    if (!navigationRef.isReady()) return
    navigationRef.navigate('Report', {
      result: { prediction: data.prediction, weather: data.weather },
      groundName: data.groundName,
      overs: data.overs,
      squad: null,
      reportId: data.reportId.startsWith('local_') ? undefined : data.reportId,
      scrollToMatch: true,
    })
  }

  const handleMatchReminderLater = async () => {
    setMatchReminderData(null)
    await suppressMatchReminderFor24h()
  }

  return (
    <OfflineContext.Provider value={{ isOffline, setIsOffline }}>
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} linking={linking}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
          >
            {isOffline ? (
              <>
                <Stack.Screen name="Offline" component={OfflineScreenWrapper} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="Report" component={ReportScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Permissions" component={PermissionsScreen} />
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="Review" component={ReviewScreen} />
                <Stack.Screen name="Camera" component={CameraScreen} />
                <Stack.Screen name="PhotoPicker" component={PhotoPickerScreen} />
                <Stack.Screen name="GroundSearch" component={GroundSearchScreen} />
                <Stack.Screen name="Analysing" component={AnalysingScreen} />
                <Stack.Screen name="Report" component={ReportScreen} />
                <Stack.Screen name="Paywall" component={PaywallScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
                <Stack.Screen name="Privacy" component={PrivacyScreen} />
                <Stack.Screen name="Feedback" component={FeedbackScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>

        <TossReminderModal
          visible={reminderData !== null}
          groundName={reminderData?.groundName ?? ''}
          onLogNow={handleReminderLogNow}
          onLater={handleReminderLater}
        />
        <MatchReminderModal
          visible={matchReminderData !== null}
          onLogNow={handleMatchReminderLogNow}
          onLater={handleMatchReminderLater}
        />
      </View>
    </OfflineContext.Provider>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const offlineAppStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (isOffline && !showSplash) track('offline_screen_shown')
  }, [isOffline, showSplash])

  useEffect(() => {
    try {
      configurePurchases()
    } catch (e) {
      console.warn('RevenueCat configure failed:', e)
    }
    ;(async () => {
      await usageStore.init()
      const analyticsEnabled = await AsyncStorage.getItem('analyticsEnabled')
      if (analyticsEnabled === 'true') {
        try { await initMixpanel() } catch (e) { console.warn('Mixpanel init failed:', e) }
      }
      const result = await checkForUpdate()
      if (result.required) setUpdateResult(result)
    })()

    const handleNetInfo = (state: NetInfoState) => {
      const offline = state.isConnected === false || state.isInternetReachable === false
      setIsOffline(offline)
    }
    const unsubNetInfo = NetInfo.addEventListener(handleNetInfo)

    const handleAppState = async (nextState: AppStateStatus) => {
      const wasBackground = offlineAppStateRef.current !== 'active'
      offlineAppStateRef.current = nextState
      if (nextState !== 'active' || !wasBackground) return
      const state = await NetInfo.fetch()
      const offline = state.isConnected === false || state.isInternetReachable === false
      setIsOffline(offline)
    }
    const subAppState = AppState.addEventListener('change', handleAppState)

    return () => {
      unsubNetInfo()
      subAppState.remove()
    }
  }, [])

  return (
    <ClerkErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          {showSplash ? (
            <SplashScreenView onFinish={() => setShowSplash(false)} onReady={() => SplashScreen.hideAsync()} />
          ) : (
            <AppNavigator isOffline={isOffline} setIsOffline={setIsOffline} />
          )}
          {updateResult?.required && (
            <ForceUpdateScreen
              message={updateResult.message}
              storeUrl={updateResult.storeUrl}
              minVersion={updateResult.minVersion}
            />
          )}
        </SafeAreaProvider>
      </ClerkProvider>
    </ClerkErrorBoundary>
  )
}
