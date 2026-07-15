import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { theme } from '../theme'

interface Props {
  visible: boolean
  onSignIn: () => void
  onDismiss: () => void
}

export default function SignInPromptModal({ visible, onSignIn, onDismiss }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🏏</Text>
          <Text style={styles.title}>Sign in to Cricket Tosser</Text>
          <Text style={styles.body}>
            Sign in to save your match history, sync reports across devices, and unlock Pro.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onSignIn} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Maybe later</Text>
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
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    letterSpacing: -0.4,
    color: theme.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
    color: theme.textInverse,
    fontSize: 16,
  },
  secondaryBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Inter-Medium',
    color: theme.textSecondary,
    fontSize: 14,
  },
})
