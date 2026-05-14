import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { theme } from '../theme'
import { groundStore } from '../lib/groundStore'

type Props = NativeStackScreenProps<RootStackParamList, 'GroundSearch'>

type GroundItem = {
  id: string
  name: string
  sub: string
  lat?: number
  lng?: number
  placeId?: string
}

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.EXPO_PUBLIC_ANON_KEY!

export default function GroundSearchScreen({ navigation, route }: Props) {
  const { currentLocationName, currentLat: _lat, currentLng: _lng } = route.params ?? {}
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<GroundItem[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const localGroundsRef = useRef<GroundItem[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    async function fetchLocalGrounds() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/grounds?select=*&order=name`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        )
        const data = await res.json()
        if (Array.isArray(data)) {
          const grounds: GroundItem[] = data.map((g: any) => ({
            id: g.id,
            name: g.name,
            sub: [g.city, g.county].filter(Boolean).join(', '),
            lat: g.lat,
            lng: g.lng,
          }))
          localGroundsRef.current = grounds
          setItems(grounds)
        }
      } catch {}
    }
    fetchLocalGrounds()
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  const searchPlaces = useCallback(async (text: string) => {
    setLoadingPlaces(true)
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(text)}&key=${GOOGLE_KEY}&language=en&components=country:gb&types=establishment`
      const res = await fetch(url)
      const data = await res.json()
      if (Array.isArray(data.predictions)) {
        setItems(
          data.predictions.map((p: any) => ({
            id: p.place_id,
            name: p.structured_formatting.main_text,
            sub: p.structured_formatting.secondary_text ?? '',
            placeId: p.place_id,
          }))
        )
      } else {
        setItems([])
      }
    } catch {
      setItems([])
    }
    setLoadingPlaces(false)
  }, [])

  const handleQueryChange = (text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) {
      setItems(localGroundsRef.current)
      return
    }
    debounceRef.current = setTimeout(() => searchPlaces(text), 300)
  }

  const handleSelect = async (item: GroundItem) => {
    if (item.lat !== undefined && item.lng !== undefined) {
      groundStore.setGround(item.name, item.lat, item.lng)
      navigation.goBack()
      return
    }
    if (item.placeId) {
      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/details/json` +
          `?place_id=${item.placeId}&key=${GOOGLE_KEY}&fields=geometry,name`
        const res = await fetch(url)
        const data = await res.json()
        const loc = data.result?.geometry?.location
        if (loc) {
          groundStore.setGround(item.name, loc.lat, loc.lng)
          navigation.goBack()
        }
      } catch {}
    }
  }

  const handleUseLocation = () => {
    groundStore.resetToGPS()
    navigation.goBack()
  }

  const PinnedRow = (
    <>
      <TouchableOpacity style={styles.pinnedRow} onPress={handleUseLocation} activeOpacity={0.7}>
        <Text style={styles.pinnedIcon}>📍</Text>
        <View>
          <Text style={styles.pinnedText}>Use my current location</Text>
          <Text style={styles.pinnedSub}>{currentLocationName ?? 'Your GPS location'}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.divider} />
    </>
  )

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.navTitle}>Select ground</Text>
          <Text style={styles.navSub}>Search any UK cricket club</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search cricket ground or club..."
            placeholderTextColor={theme.text.muted}
            value={query}
            onChangeText={handleQueryChange}
            autoCorrect={false}
            returnKeyType="search"
          />
          {loadingPlaces && (
            <ActivityIndicator size="small" color={theme.green.mid} style={styles.spinner} />
          )}
        </View>

        <FlatList
          data={items}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={PinnedRow}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>{item.sub}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loadingPlaces && query.trim() ? (
              <Text style={styles.emptyText}>No grounds found</Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.green.dark },
  nav: {
    backgroundColor: theme.green.dark,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: '#fff', fontSize: 22, paddingRight: 8 },
  navTitle: { color: '#fff', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  navSub: { color: theme.green.light, fontSize: 11, textAlign: 'center' },
  body: { flex: 1, backgroundColor: theme.soil, padding: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.soilBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.text.mid, padding: 0 },
  spinner: { marginLeft: 8 },
  list: { paddingBottom: 24 },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pinnedIcon: { fontSize: 18, marginRight: 10 },
  pinnedText: { fontSize: 14, fontWeight: '500', color: theme.green.mid },
  pinnedSub: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.soilBorder, marginVertical: 8 },
  row: {
    backgroundColor: theme.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.soilBorder,
  },
  rowName: { fontSize: 14, fontWeight: '500', color: theme.text.dark },
  rowSub: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
  emptyText: {
    fontSize: 14,
    color: theme.text.muted,
    textAlign: 'center',
    marginTop: 16,
  },
})
