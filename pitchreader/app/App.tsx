import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import HomeScreen from './src/screens/HomeScreen'
import CameraScreen from './src/screens/CameraScreen'
import AnalysingScreen from './src/screens/AnalysingScreen'
import ReportScreen from './src/screens/ReportScreen'
import GroundSearchScreen from './src/screens/GroundSearchScreen'
import PhotoPickerScreen from './src/screens/PhotoPickerScreen'
import SplashScreenView from './src/screens/SplashScreenView'

SplashScreen.preventAutoHideAsync()

export type RootStackParamList = {
  Home: { photoBase64?: string; slotIndex?: number } | undefined
  Camera: { slotIndex: number }
  PhotoPicker: { slotIndex: number }
  Analysing: { photos: string[]; groundName: string; overs: number; lat: number; lng: number; squad?: { seamers: number; fastAllRounders: number; spinners: number; spinAllRounders: number; batters: number } | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Report: { result: any; groundName: string; overs: number; squad?: { seamers: number; fastAllRounders: number; spinners: number; spinAllRounders: number; batters: number } | null }
  GroundSearch: { currentLocationName?: string; currentLat?: number; currentLng?: number }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // Dismiss the native splash immediately — our SplashScreenView takes over
    SplashScreen.hideAsync()
  }, [])

  return (
    <SafeAreaProvider>
      {showSplash ? (
        <SplashScreenView onFinish={() => setShowSplash(false)} />
      ) : (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="PhotoPicker" component={PhotoPickerScreen} />
            <Stack.Screen name="GroundSearch" component={GroundSearchScreen} />
            <Stack.Screen name="Analysing" component={AnalysingScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  )
}
