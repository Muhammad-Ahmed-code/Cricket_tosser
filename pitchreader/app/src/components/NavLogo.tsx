import { View, Text, StyleSheet } from 'react-native'

export default function NavLogo() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.cricket}>CRICKET</Text>
      <View style={styles.wordmark}>
        <Text style={styles.letter}>T</Text>
        <View style={styles.ball}>
          <View style={styles.ballInner}>
            <View style={styles.seamTop} />
            <View style={styles.seamBottom} />
          </View>
        </View>
        <Text style={styles.letter}>SSER</Text>
      </View>
      <Text style={styles.ai}>POWERED BY AI</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  cricket: {
    fontSize: 8,
    fontWeight: '500',
    color: '#7ec87e',
    letterSpacing: 4,
    marginBottom: 1,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  letter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f5f0e8',
    fontFamily: 'serif',
  },
  ball: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#cc2222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginHorizontal: 1,
  },
  ballInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seamTop: {
    position: 'absolute',
    top: 6,
    left: 2,
    right: 2,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  seamBottom: {
    position: 'absolute',
    bottom: 6,
    left: 2,
    right: 2,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  ai: {
    fontSize: 6,
    color: '#7ec87e',
    letterSpacing: 2,
    marginTop: 1,
    opacity: 0.8,
  },
})
