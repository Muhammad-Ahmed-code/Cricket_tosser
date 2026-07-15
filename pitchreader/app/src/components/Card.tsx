import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { theme } from '../theme'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
}

export default function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.paper,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    padding: theme.space5,
    shadowColor: theme.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
})
