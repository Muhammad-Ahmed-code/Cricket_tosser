import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { theme } from '../theme'

type WeatherData = {
  temp_celsius: number
  humidity_percent: number
  wind_kph: number
  rain_last_48h_mm: number
  conditions: string
  drying_out: boolean
  rain_probability_percent: number
  expected_rainfall_mm: number
  forecast_conditions: string
  match_likely_affected: boolean
}

type Props = {
  weather?: WeatherData | null
}

export default function WeatherStrip({ weather }: Props) {
  if (!weather) return null

  const rainPct = weather.rain_probability_percent ?? 0

  const cards = [
    { emoji: '🌡️', value: `${weather.temp_celsius}°C`, label: 'Temp', highlight: null as null | 'amber' | 'red' },
    { emoji: '💧', value: `${weather.humidity_percent}%`, label: 'Humidity', highlight: null as null | 'amber' | 'red' },
    { emoji: '💨', value: `${weather.wind_kph} km/h`, label: 'Wind', highlight: null as null | 'amber' | 'red' },
    {
      emoji: '☔',
      value: `${rainPct}%`,
      label: 'Today',
      highlight: (rainPct > 50 ? 'red' : rainPct >= 25 ? 'amber' : null) as null | 'amber' | 'red',
    },
    { emoji: '🌧️', value: `${weather.rain_last_48h_mm}mm`, label: 'Last 48h', highlight: null as null | 'amber' | 'red' },
    { emoji: '🌤️', value: weather.forecast_conditions, label: 'Forecast', highlight: null as null | 'amber' | 'red' },
  ]

  return (
    <View style={styles.container}>
      {weather.match_likely_affected && (
        <View style={styles.rainBanner}>
          <Text style={styles.rainBannerText}>
            ⚠️ Rain likely during match hours — DLS rules may apply
          </Text>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {cards.map((card, i) => (
          <View
            key={i}
            style={[
              styles.card,
              card.highlight === 'red' && styles.cardRed,
              card.highlight === 'amber' && styles.cardAmber,
            ]}
          >
            <Text style={styles.cardEmoji}>{card.emoji}</Text>
            <Text style={styles.cardValue} numberOfLines={2}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  rainBanner: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0AD4E',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  rainBannerText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  strip: {
    paddingHorizontal: 2,
  },
  card: {
    width: 90,
    padding: 10,
    borderRadius: 14,
    backgroundColor: theme.paper,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    marginRight: 8,
    shadowColor: theme.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRed: {
    backgroundColor: '#FFE8E8',
    borderColor: theme.ball,
  },
  cardAmber: {
    backgroundColor: '#FFF8E7',
    borderColor: '#F0AD4E',
  },
  cardEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardValue: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardLabel: {
    color: theme.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
})
