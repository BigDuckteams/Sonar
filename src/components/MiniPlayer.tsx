import { Ionicons } from '@expo/vector-icons';
import TrackPlayer, { PlaybackState, useIsPlaying, usePlaybackState, useProgress } from '@rntp/player';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrentTrack } from '../player/hooks';
import { colors } from '../theme';
import type { RootStackParamList } from '../types';
import { Cover } from './Cover';

function Bar() {
  const { position, duration } = useProgress(1);
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct}%` }]} />
    </View>
  );
}

export function MiniPlayer() {
  const track = useCurrentTrack();
  const playing = useIsPlaying();
  const state = usePlaybackState();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!track) return null;

  return (
    <Pressable
      onPress={() => nav.navigate('Player')}
      accessibilityLabel={`Сейчас играет ${track.title}. Открыть плеер`}
      style={styles.wrap}
    >
      <Cover uri={track.artwork} seed={track.key} size={44} radius={6} />
      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist}
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())}
        accessibilityLabel={playing ? 'Пауза' : 'Играть'}
        style={styles.btn}
      >
        {state === PlaybackState.Buffering && !playing ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Ionicons name={playing ? 'pause' : 'play'} size={28} color={colors.text} />
        )}
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => TrackPlayer.skipToNext()}
        accessibilityLabel="Следующий трек"
        style={styles.btn}
      >
        <Ionicons name="play-skip-forward" size={24} color={colors.text} />
      </Pressable>
      <Bar />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  meta: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  artist: { color: colors.muted, fontSize: 12, marginTop: 1 },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: colors.line },
  barFill: { height: 2, backgroundColor: colors.accent },
});
