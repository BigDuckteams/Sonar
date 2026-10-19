import { Ionicons } from '@expo/vector-icons';
import TrackPlayer, { useIsPlaying } from '@rntp/player';
import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cover } from '../components/Cover';
import { Screen } from '../components/Screen';
import { EmptyState, Header, IconButton } from '../components/ui';
import { useRootNav } from '../nav';
import { itemToTrack } from '../player/engine';
import { useQueue } from '../player/hooks';
import { colors } from '../theme';
import { countTracks, fmtTime } from '../util';

export function QueueScreen() {
  const nav = useRootNav();
  const { items, index } = useQueue();
  const playing = useIsPlaying();

  const clearUpcoming = () => {
    if (index === null) return;
    TrackPlayer.removeMediaItems(index + 1, items.length);
  };

  const upcoming = index === null ? 0 : Math.max(0, items.length - index - 1);

  return (
    <Screen>
      <Header
        title="Очередь"
        subtitle={items.length ? countTracks(items.length) : undefined}
        right={
          <>
            {upcoming > 0 ? (
              <IconButton name="trash-outline" label="Убрать следующие треки" onPress={clearUpcoming} />
            ) : null}
            <IconButton name="chevron-down" label="Закрыть" onPress={() => nav.goBack()} />
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon="list-outline" title="Очередь пуста" text="Добавляйте треки через меню ⋮ → «Добавить в очередь»." />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item, i) => `${i}:${item.mediaId ?? ''}`}
          extraData={`${index}:${playing}`}
          initialScrollIndex={index && index > 2 ? index - 1 : undefined}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index: i }) => {
            const track = itemToTrack(item);
            if (!track) return null;
            const active = i === index;
            return (
              <Pressable
                onPress={() => {
                  TrackPlayer.skipToIndex(i);
                  TrackPlayer.play();
                }}
                android_ripple={{ color: '#ffffff14' }}
                style={styles.row}
              >
                <Cover uri={track.artwork} seed={track.key} size={46} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[styles.title, active && { color: colors.accent }]}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.artist}>
                    {track.artist}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name={playing ? 'volume-high' : 'pause'} size={18} color={colors.accent} />
                ) : (
                  <Text style={styles.dur}>{fmtTime(track.duration)}</Text>
                )}
                {!active ? (
                  <IconButton
                    name="close"
                    size={20}
                    color={colors.muted}
                    label="Убрать из очереди"
                    onPress={() => TrackPlayer.removeMediaItem(i)}
                    style={{ marginRight: -10 }}
                  />
                ) : (
                  <View style={{ width: 34 }} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  artist: { color: colors.muted, fontSize: 13, marginTop: 2 },
  dur: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
