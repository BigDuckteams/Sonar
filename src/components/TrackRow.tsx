import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { Track } from '../types';
import { fmtTime } from '../util';
import { Cover } from './Cover';
import { Badge } from './ui';

interface Props {
  track: Track;
  index: number;
  active?: boolean;
  playing?: boolean;
  onPress: (track: Track, index: number) => void;
  onMore: (track: Track) => void;
}

export const TrackRow = memo(function TrackRow({ track, index, active, playing, onPress, onMore }: Props) {
  return (
    <Pressable
      onPress={() => onPress(track, index)}
      onLongPress={() => onMore(track)}
      android_ripple={{ color: '#ffffff14' }}
      accessibilityLabel={`${track.title}, ${track.artist}`}
      style={styles.row}
    >
      <Cover uri={track.artwork} seed={track.key} size={48} />
      <View style={styles.meta}>
        <Text numberOfLines={1} style={[styles.title, active && { color: colors.accent }]}>
          {track.title}
        </Text>
        <View style={styles.sub}>
          {track.preview ? <Badge text="30 с" /> : null}
          <Text numberOfLines={1} style={styles.artist}>
            {track.artist}
          </Text>
        </View>
      </View>
      {active ? (
        <Ionicons name={playing ? 'volume-high' : 'pause'} size={18} color={colors.accent} />
      ) : null}
      <Text style={styles.dur}>{fmtTime(track.duration)}</Text>
      <Pressable
        onPress={() => onMore(track)}
        hitSlop={8}
        accessibilityLabel="Действия с треком"
        style={styles.more}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  meta: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sub: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  artist: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  dur: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'], minWidth: 34, textAlign: 'right' },
  more: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
});
