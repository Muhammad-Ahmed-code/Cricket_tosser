import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { theme } from '../theme'

interface Props {
  visible: boolean
  groundName: string
  onLogNow: () => void
  onLater: () => void
}

export default function TossReminderModal({ visible, groundName, onLogNow, onLater }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onLater}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🏏</Text>
          <Text style={styles.title}>Still playing?</Text>
          <Text style={styles.body}>
            Log your toss result for{' '}
            <Text style={styles.ground}>{groundName || 'your recent pitch analysis'}</Text>
            .
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onLogNow} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Log Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onLater} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,64,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: theme.paper,
    borderRadius: theme.radiusXl,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  icon: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  ground: {
    color: theme.textPrimary,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: theme.forest,
    borderRadius: theme.radiusMd,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: theme.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
})
