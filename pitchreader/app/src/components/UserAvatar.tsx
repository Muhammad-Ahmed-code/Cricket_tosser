import React from 'react'
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'

interface Props {
  imageUrl?: string | null
  name?: string | null
  size?: number
  onPress?: () => void
}

export default function UserAvatar({ imageUrl, name, size = 40, onPress }: Props) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0]
        ? parts[0].slice(0, 2).toUpperCase()
        : ''

  const s = size
  const iconSize = Math.round(s * 0.5)

  const avatar = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      style={{ width: s, height: s, borderRadius: s / 2 }}
      resizeMode="cover"
    />
  ) : initials ? (
    <View style={[{ width: s, height: s, borderRadius: s / 2 }, st.initialsCircle]}>
      <Text style={[st.initialsText, { fontSize: Math.round(s * 0.36) }]}>{initials}</Text>
    </View>
  ) : (
    <View style={[{ width: s, height: s, borderRadius: s / 2 }, st.anonCircle]}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={4} stroke="rgba(82,98,74,0.65)" strokeWidth={2} />
        <Path
          d="M4 20a8 8 0 0 1 16 0"
          stroke="rgba(82,98,74,0.65)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {avatar}
      </TouchableOpacity>
    )
  }
  return avatar
}

const st = StyleSheet.create({
  initialsCircle: {
    backgroundColor: '#903020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonCircle: {
    backgroundColor: 'rgba(208,212,197,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFDF7',
    fontWeight: '700',
  },
})
