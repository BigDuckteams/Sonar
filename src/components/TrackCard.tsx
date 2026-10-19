import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { useCurrentKey } from '../player/hooks';
import { colors } from '../theme';
import type { Track } from '../types';
import { Cover } from './Cover';

const SIZE = 132;

const Card = memo(function Card({
  track,
  index,
  active,
  onPress,
  onLong,
}: {
  track: Track;
  index: number;
  active: boolean;
  onPress: (track: Track, index: number) => void;
  onLong: (track: Track) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(track, index)}
      onLongPress={() => onLong(track)}
      accessibilityLabel={`${track.title}, ${track.artist}`}
      style={styles.card}
    >
      <Cover uri={track.artwork} seed={track.key} size={SIZE} radius={10} />
      <Text numberOfLines={1} style={[styles.title, active && { color: colors.accent }]}>
        {track.title}
      </Text>
      <Text numberOfLines={1} style={styles.artist}>
        {track.artist}
      </Text>
    </Pressable>
  );
});

/** Horizontal shelf of tracks; tapping one plays the whole shelf from there. */
export function TrackShelf(props: {
  tracks: Track[];
  onPlay: (tracks: Track[], index: number) => void;
  onMore: (track: Track) => void;
}) {
  const currentKey = useCurrentKey();
  const { tracks, onPlay, onMore } = props;
  return (
    <FlatList
      horizontal
      data={tracks}
      keyExtractor={(t) => t.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      extraData={currentKey}
      renderItem={({ item, index }) => (
        <Card
          track={item}
          index={index}
          active={item.key === currentKey}
          onPress={(_, i) => onPlay(tracks, i)}
          onLong={onMore}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { width: SIZE },
  title: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 8 },
  artist: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
