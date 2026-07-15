import React from 'react'
import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { theme } from '../theme'

interface Props {
  visible: boolean
  required: boolean
  message: string
  storeUrl: string
  onDismiss?: () => void
}

export default function UpdateModal({ visible, required, message, storeUrl, onDismiss }: Props) {
  const openStore = () => {
    if (storeUrl) Linking.openURL(storeUrl)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={required ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🏏</Text>
          <Text style={styles.title}>
            {required ? 'Update Required' : 'Update Available'}
          </Text>
          <Text style={styles.body}>{message}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openStore} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Update Now</Text>
          </TouchableOpacity>
          {!required && onDismiss && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,64,32,0.75)',
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
