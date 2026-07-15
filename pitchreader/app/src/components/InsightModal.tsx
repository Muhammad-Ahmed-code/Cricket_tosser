import React from 'react'
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'

type Props = {
  visible: boolean
  onClose: () => void
  title: string
  content: string
  icon: string
  extraContext?: string
}

export default function InsightModal({ visible, onClose, title, content, icon, extraContext }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.content}>{content}</Text>

          {extraContext && (
            <View style={styles.contextBox}>
              <Text style={styles.contextLabel}>WHY THIS MATTERS</Text>
              <Text style={styles.contextText}>{extraContext}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,64,32,0.38)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFDF7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D8D4C5',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D8D4C5',
    gap: 10,
  },
  icon: { fontSize: 22 },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#14351F',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7F2E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 12, color: '#52624A' },
  body: { padding: 16 },
  content: {
    fontSize: 15,
    color: '#14351F',
    lineHeight: 24,
    marginBottom: 16,
  },
  contextBox: {
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#D8D4C5',
    padding: 14,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#52624A',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  contextText: {
    fontSize: 13,
    color: '#14351F',
    lineHeight: 20,
  },
})
