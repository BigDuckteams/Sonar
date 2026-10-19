import { Ionicons } from '@expo/vector-icons';
import { useIsPlaying } from '@rntp/player';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { TrackRow } from '../components/TrackRow';
import { TrackShelf } from '../components/TrackCard';
import { Button, Chip, EmptyState, Header, IconButton, SectionTitle } from '../components/ui';
import { usePaged } from '../hooks/usePaged';
import { useRootNav, useTabNav } from '../nav';
import { playTracks } from '../player/engine';
import { useCurrentKey } from '../player/hooks';
import * as Audius from '../sources/audius';
import type { TrendingTime } from '../sources/audius';
import { useDevice } from '../store/device';
import { topTracks, useLibrary } from '../store/library';
import { colors, radius } from '../theme';
import type { Track } from '../types';
import { openTrackMenu } from '../ui/sheets';

function DeviceCard() {
  const device = useDevice();
  const tab = useTabNav();

  if (device.status === 'needs-permission' || device.status === 'denied') {
    return (
      <View style={styles.card}>
        <Ionicons name="phone-portrait-outline" size={28} color={colors.accent} />
        <Text style={styles.cardTitle}>Музыка с вашего телефона</Text>
        <Text style={styles.cardText}>
          Sonar найдёт скачанные треки и покажет их здесь. Файлы остаются на телефоне и никуда не
          отправляются.
        </Text>
        <Button label="Показать мою музыку" icon="musical-notes" onPress={() => void device.request()} />
      </View>
    );
  }
  if (device.status === 'blocked') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Нужен доступ к музыке</Text>
        <Text style={styles.cardText}>Разрешите Sonar доступ к аудио в настройках телефона.</Text>
        <Button label="Открыть настройки" icon="settings-outline" onPress={() => void Linking.openSettings()} />
      </View>
    );
  }
  if (device.status === 'scanning' || device.status === 'checking') {
    return (
      <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.cardText}>Ищем музыку на телефоне…</Text>
      </View>
    );
  }
  if (device.status === 'ready' && device.tracks.length > 0) {
    const latest = device.tracks.slice(0, 12);
    return (
      <>
        <SectionTitle
          title="На телефоне"
          action="Вся музыка"
          onAction={() => tab.navigate('Library', { segment: 'device' })}
        />
        <TrackShelf tracks={latest} onPlay={(list, i) => playTracks(list, i)} onMore={openTrackMenu} />
      </>
    );
  }
  return null;
}

export function HomeScreen() {
  const root = useRootNav();
  const history = useLibrary((s) => s.history);
  const stats = useLibrary((s) => s.stats);
  const currentKey = useCurrentKey();
  const isPlaying = useIsPlaying();

  const [genre, setGenre] = useState('');
  const [time, setTime] = useState<TrendingTime>('week');

  const trend = usePaged(
    (offset, signal) => Audius.trending({ genre, time, offset, limit: 20 }, signal),
    [genre, time],
  );

  const recent = useMemo(() => history.slice(0, 12), [history]);
  const top = useMemo(() => topTracks(stats, 12), [stats]);

  const play = useCallback((list: Track[], index: number) => playTracks(list, index), []);
  const onPress = useCallback((_: Track, i: number) => playTracks(trend.items, i), [trend.items]);

  return (
    <Screen>
      <Header
        title="Sonar"
        right={
          <IconButton
            name="settings-outline"
            label="Настройки"
            onPress={() => root.navigate('Settings')}
          />
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.pad}>
          <DeviceCard />
        </View>

        {recent.length > 0 ? (
          <>
            <View style={styles.pad}>
              <SectionTitle
                title="Недавно играло"
                action="Все"
                onAction={() => root.navigate('Collection', { kind: 'history', title: 'Недавно играло' })}
              />
            </View>
            <TrackShelf tracks={recent} onPlay={play} onMore={openTrackMenu} />
          </>
        ) : null}

        {top.length > 0 ? (
          <>
            <View style={styles.pad}>
              <SectionTitle
                title="Часто слушаете"
                action="Все"
                onAction={() => root.navigate('Collection', { kind: 'top', title: 'Часто слушаете' })}
              />
            </View>
            <TrackShelf tracks={top} onPlay={play} onMore={openTrackMenu} />
          </>
        ) : null}

        <View style={styles.pad}>
          <SectionTitle title="В тренде" />
          <Text style={styles.hint}>Полные треки независимых артистов — слушайте целиком, без аккаунта.</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {Audius.GENRES.map((g) => (
            <Chip key={g.id} label={g.label} selected={g.id === genre} onPress={() => setGenre(g.id)} />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chips, { paddingTop: 0 }]}
        >
          {Audius.TIMES.map((t) => (
            <Chip key={t.id} label={t.label} selected={t.id === time} onPress={() => setTime(t.id)} />
          ))}
        </ScrollView>

        <View style={{ marginTop: 6 }}>
          {trend.items.map((t, i) => (
            <TrackRow
              key={t.key}
              track={t}
              index={i}
              active={t.key === currentKey}
              playing={t.key === currentKey && isPlaying}
              onPress={onPress}
              onMore={openTrackMenu}
            />
          ))}
          {trend.loading ? <ActivityIndicator color={colors.accent} style={{ margin: 24 }} /> : null}
          {trend.error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Не удалось загрузить"
              text="Проверьте интернет и попробуйте ещё раз."
              actionLabel="Повторить"
              onAction={trend.retry}
            />
          ) : null}
          {!trend.loading && !trend.error && trend.items.length === 0 ? (
            <EmptyState icon="musical-notes-outline" title="Здесь пока пусто" text="Попробуйте другой жанр." />
          ) : null}
          {trend.more && !trend.loading ? (
            <View style={styles.pad}>
              <Button label="Показать ещё" kind="ghost" onPress={trend.loadMore} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  chips: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  hint: { color: colors.muted, fontSize: 13, marginTop: -4 },
  card: {
    marginTop: 8,
    padding: 18,
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardText: { color: colors.muted, fontSize: 14, flexShrink: 1 },
});
