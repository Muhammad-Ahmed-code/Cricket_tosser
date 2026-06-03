import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import * as SecureStore from 'expo-secure-store'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
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
import { usageStore } from './src/lib/usageStore'
import { authStore } from './src/lib/authStore'
import { configurePurchases } from './src/lib/purchases'
import { usePurchases } from './src/lib/usePurchases'

SplashScreen.preventAutoHideAsync()

// Replace with your real Clerk publishable key
const CLERK_PUBLISHABLE_KEY = 'pk_test_ZmVhc2libGUtbWFydGVuLTk0LmNsZXJrLmFjY291bnRzLmRldiQ'

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key) },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value) },
  async clearToken(key: string) { return SecureStore.deleteItemAsync(key) },
}

export type RootStackParamList = {
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
  Report: { result: any; groundName: string; overs: number; squad?: { seamers: number; fastAllRounders: number; spinners: number; spinAllRounders: number; batters: number } | null; reportId?: string }
  GroundSearch: { currentLocationName?: string; currentLat?: number; currentLng?: number }
  Paywall: undefined
  History: undefined
  Review: { reportId: string; groundName: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function AppNavigator() {
  const { isLoaded, isSignedIn } = useAuth()
  const [isAnonymous, setIsAnonymous] = useState(authStore.getIsAnonymous())
  usePurchases() // Syncs RevenueCat identity whenever Clerk user changes

  useEffect(() => {
    return authStore.subscribe(() => setIsAnonymous(authStore.getIsAnonymous()))
  }, [])

  // Hold rendering until Clerk has resolved auth state
  if (!isLoaded) return null

  const initialRoute: keyof RootStackParamList =
    isSignedIn || isAnonymous ? 'Home' : 'Auth'

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
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
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    SplashScreen.hideAsync()
    configurePurchases()
    ;(async () => {
      await usageStore.init()
    })()
  }, [])

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <SafeAreaProvider>
        {showSplash ? (
          <SplashScreenView onFinish={() => setShowSplash(false)} />
        ) : (
          <AppNavigator />
        )}
      </SafeAreaProvider>
    </ClerkProvider>
  )
}
