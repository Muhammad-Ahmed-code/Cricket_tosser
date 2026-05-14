import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { squadStore } from '../lib/squadStore'
import type { Squad } from '../lib/squadStore'

type CounterDef = { key: keyof Squad; label: string; sub: string }

const PACE_COUNTERS: CounterDef[] = [
  { key: 'seamers', label: '🏃 Seamers', sub: 'Pure pace bowlers' },
  { key: 'fastAllRounders', label: '⚡ Fast all-rounders', sub: 'Bat + bowl pace' },
]
const SPIN_COUNTERS: CounterDef[] = [
  { key: 'spinners', label: '🌀 Spinners', sub: 'Pure spin bowlers' },
  { key: 'spinAllRounders', label: '🔄 Spin all-rounders', sub: 'Bat + bowl spin' },
]
const BATTING_COUNTERS: CounterDef[] = [
  { key: 'batters', label: '🏏 Batters', sub: 'Specialist batters' },
]

export default function SquadInput() {
  const [expanded, setExpanded] = useState(false)
  const [squad, setSquad] = useState<Squad>(() => squadStore.getSquad())

  const total = squad.seamers + squad.fastAllRounders + squad.spinners + squad.spinAllRounders + squad.batters
  const paceOptions = squad.seamers + squad.fastAllRounders
  const spinOptions = squad.spinners + squad.spinAllRounders
  const hasAny = total > 0

  const update = (key: keyof Squad, delta: number) => {
    const next = { ...squad, [key]: Math.min(6, Math.max(0, squad[key] + delta)) }
    setSquad(next)
    squadStore.setSquad(next)
  }

  const clear = () => {
    const empty = { seamers: 0, fastAllRounders: 0, spinners: 0, spinAllRounders: 0, batters: 0 }
    setSquad(empty)
    squadStore.clear()
  }

  const totalColor =
    total === 11 ? '#2d5a27' :
    total > 0 ? '#b35a00' :
    '#9a8a70'

  const renderCounter = ({ key, label, sub }: CounterDef) => (
    <View key={key} style={styles.counterRow}>
      <View style={styles.counterLabels}>
        <Text style={styles.counterLabel}>{label}</Text>
        <Text style={styles.counterSub}>{sub}</Text>
      </View>
      <View style={styles.counterControls}>
        <TouchableOpacity style={styles.counterBtn} onPress={() => update(key, -1)} activeOpacity={0.7}>
          <Text style={styles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterNum}>{squad[key]}</Text>
        <TouchableOpacity style={styles.counterBtn} onPress={() => update(key, 1)} activeOpacity={0.7}>
          <Text style={styles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>👥 Add your squad</Text>
          <View style={styles.optionalPill}>
            <Text style={styles.optionalText}>Optional</Text>
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '∨' : '›'}</Text>
      </TouchableOpacity>

      {!expanded && (
        <Text style={styles.hint}>Get a squad rating for this pitch</Text>
      )}

      {expanded && (
        <View style={styles.body}>
          <Text style={styles.groupLabel}>PACE</Text>
          {PACE_COUNTERS.map(renderCounter)}

          <Text style={[styles.groupLabel, styles.groupLabelGap]}>SPIN</Text>
          {SPIN_COUNTERS.map(renderCounter)}

          <Text style={[styles.groupLabel, styles.groupLabelGap]}>BATTING</Text>
          {BATTING_COUNTERS.map(renderCounter)}

          {hasAny && (
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLine}>
                Pace options: {paceOptions} · Spin options: {spinOptions}
              </Text>
              <View style={styles.footer}>
                <View>
                  <Text style={[styles.totalCount, { color: totalColor }]}>
                    Total: {total} players
                  </Text>
                  {total < 10 && (
                    <Text style={[styles.statusMsg, { color: '#b35a00' }]}>Need at least 10</Text>
                  )}
                  {total === 11 && (
                    <Text style={[styles.statusMsg, { color: '#2d5a27' }]}>Perfect XI ✓</Text>
                  )}
                  {total > 11 && (
                    <Text style={[styles.statusMsg, { color: '#b35a00' }]}>That's {total} — a full XI is 11</Text>
                  )}
                </View>
                <TouchableOpacity onPress={clear} activeOpacity={0.7}>
                  <Text style={styles.clearLink}>Clear squad</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b5a3e',
  },
  optionalPill: {
    backgroundColor: '#e8e0d0',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  optionalText: {
    fontSize: 10,
    color: '#9a8a70',
  },
  chevron: {
    fontSize: 16,
    color: '#9a8a70',
  },
  hint: {
    fontSize: 11,
    color: '#9a8a70',
    marginTop: 4,
  },
  body: {
    marginTop: 10,
  },
  groupLabel: {
    fontSize: 9,
    color: '#9a8a70',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  groupLabelGap: {
    marginTop: 14,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4c9b0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  counterLabels: {
    flex: 1,
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a3a1a',
  },
  counterSub: {
    fontSize: 11,
    color: '#9a8a70',
    marginTop: 1,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8e0d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 16,
    color: '#1a3a1a',
    lineHeight: 20,
  },
  counterNum: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1a3a1a',
    width: 28,
    textAlign: 'center',
  },
  summaryBlock: {
    marginTop: 4,
  },
  summaryLine: {
    fontSize: 11,
    color: '#6b5a3e',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
  },
  totalCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusMsg: {
    fontSize: 11,
    marginTop: 2,
  },
  clearLink: {
    fontSize: 12,
    color: '#9a8a70',
  },
})
