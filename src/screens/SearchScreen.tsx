import { Ionicons } from '@expo/vector-icons';
import { useIsPlaying } from '@rntp/player';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '../components/Screen';
import { TrackRow } from '../components/TrackRow';
import { Button, Chip, EmptyState, Header, SectionTitle } from '../components/ui';
import { usePaged } from '../hooks/usePaged';
import { useTabNav } from '../nav';
import { playTracks } from '../player/engine';
import { useCurrentKey } from '../player/hooks';
import * as Audius from '../sources/audius';
import { useDevice } from '../store/device';
import { useLibrary } from '../store/library';
import { colors, radius } from '../theme';
import type { Page, Track } from '../types';
import { filterTracks } from '../util';
import { openTrackMenu } from '../ui/sheets';

type Filter = 'all' | 'device' | 'audius';

const EMPTY: Page = { items: [], more: false, next: 0 };
const IDEAS = ['lofi', 'chill', 'piano', 'jazz', 'ambient', 'house', 'techno', 'trap'];

interface SectionProps {
  title: string;
  tracks: Track[];
  loading?: boolean;
  error?: boolean;
  limit?: number;
  onAll?: () => void;
  onPlay: (tracks: Track[], index: number) => void;
}

function Section(props: SectionProps) {
  const currentKey = useCurrentKey();
  const isPlaying = useIsPlaying();
  const { tracks, limit } = props;
  const shown = limit ? tracks.slice(0, limit) : tracks;
  const onPress = useCallback((_: Track, i: number) => props.onPlay(shown, i), [props, shown]);

  if (!props.loading && !props.error && tracks.length === 0) return null;
  return (
    <View>
      <View style={styles.pad}>
        <SectionTitle
          title={props.title}
          action={limit && tracks.length > limit ? 'Показать все' : undefined}
          onAction={props.onAll}
        />
      </View>
      {shown.map((t, i) => (
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
      {props.loading ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
      {props.error ? <Text style={[styles.note, styles.pad]}>Источник сейчас недоступен.</Text> : null}
    </View>
  );
}

/**
 * Songs of big labels are not given away in full by anyone for free, so instead of
 * faking it we point to the official services where they are available.
 */
function ElsewhereCard({ query }: { query: string }) {
  const tab = useTabNav();
  return (
    <View style={[styles.card, styles.pad]}>
      <Text style={styles.cardTitle}>Ищете конкретного исполнителя?</Text>
      <Text style={styles.note}>
        Песни крупных лейблов целиком есть на официальном YouTube — откройте «{query}» прямо в Sonar
        (играет, пока приложение открыто). Скачанные файлы этих песен найдутся здесь, в разделе «На
        телефоне».
      </Text>
      <View style={styles.cardButtons}>
        <View style={{ flex: 1 }}>
          <Button
            label="YouTube"
            icon="logo-youtube"
            onPress={() => tab.navigate('YouTube', { query, nonce: Date.now() })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Яндекс Музыка"
            icon="open-outline"
            kind="ghost"
            onPress={() => void Linking.openURL(`https://music.yandex.ru/search?text=${encodeURIComponent(query)}`)}
          />
        </View>
      </View>
    </View>
  );
}

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const device = useDevice();
  const recent = useLibrary((s) => s.recentSearches);
  const pushSearch = useLibrary((s) => s.pushSearch);
  const clearSearches = useLibrary((s) => s.clearSearches);

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const deviceHits = useMemo(
    () => (q && device.status === 'ready' ? filterTracks(device.tracks, q) : []),
    [q, device.status, device.tracks],
  );
  const audius = usePaged(
    (offset, signal) => (q ? Audius.search(q, { offset, limit: 20 }, signal) : Promise.resolve(EMPTY)),
    [q],
  );

  const play = useCallback(
    (tracks: Track[], index: number) => {
      if (q) pushSearch(q);
      Keyboard.dismiss();
      playTracks(tracks, index);
    },
    [q, pushSearch],
  );

  const all = filter === 'all';
  const nothing = !!q && !audius.loading && deviceHits.length === 0 && audius.items.length === 0;

  return (
    <Screen>
      <Header title="Поиск" />
      <View style={styles.pad}>
        <View style={styles.box}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              setQ(query.trim());
              pushSearch(query);
            }}
            placeholder="Трек, исполнитель, альбом"
            placeholderTextColor={colors.faint}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Поиск музыки"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Очистить">
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {q ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={styles.chips}
        >
          <Chip label="Всё" selected={all} onPress={() => setFilter('all')} />
          <Chip label="На телефоне" selected={filter === 'device'} onPress={() => setFilter('device')} />
          <Chip label="Полные треки" selected={filter === 'audius'} onPress={() => setFilter('audius')} />
        </ScrollView>
      ) : null}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        {!q ? (
          <View style={styles.pad}>
            {recent.length > 0 ? (
              <>
                <SectionTitle title="Недавние запросы" action="Очистить" onAction={clearSearches} />
                <View style={styles.wrap}>
                  {recent.map((r) => (
                    <Chip key={r} label={r} onPress={() => setQuery(r)} />
                  ))}
                </View>
              </>
            ) : null}
            <SectionTitle title="Попробуйте" />
            <View style={styles.wrap}>
              {IDEAS.map((r) => (
                <Chip key={r} label={r} onPress={() => setQuery(r)} />
              ))}
            </View>
            <Text style={[styles.note, { marginTop: 20 }]}>
              Sonar ищет в музыке на вашем телефоне и среди полных треков независимых артистов Audius.
              Песни крупных лейблов бесплатно целиком никто не отдаёт: скачанные файлы слушайте в
              «Медиатеке → На телефоне», а остальное под результатами поиска можно открыть у официальных
              сервисов.
            </Text>
          </View>
        ) : (
          <>
            {(all || filter === 'device') && device.status === 'ready' ? (
              <Section
                title="На телефоне"
                tracks={deviceHits}
                limit={all ? 5 : undefined}
                onAll={() => setFilter('device')}
                onPlay={play}
              />
            ) : null}
            {all || filter === 'audius' ? (
              <Section
                title="Полные треки · Audius"
                tracks={audius.items}
                loading={audius.loading}
                error={audius.error}
                limit={all ? 5 : undefined}
                onAll={() => setFilter('audius')}
                onPlay={play}
              />
            ) : null}
            {filter === 'audius' && audius.more && !audius.loading ? (
              <View style={styles.pad}>
                <Button label="Показать ещё" kind="ghost" onPress={audius.loadMore} />
              </View>
            ) : null}
            {filter === 'device' && device.status !== 'ready' ? (
              <EmptyState
                icon="phone-portrait-outline"
                title="Музыка с телефона не подключена"
                text="Разрешите доступ, и поиск найдёт скачанные треки."
                actionLabel="Подключить"
                onAction={() => void device.request()}
              />
            ) : null}
            {nothing ? (
              <EmptyState
                icon="search-outline"
                title="Полных треков не найдено"
                text="Проверьте написание или попробуйте латиницей."
              />
            ) : null}
            {!audius.loading ? <ElsewhereCard query={q} /> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    height: 48,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0 },
  chips: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  card: {
    marginTop: 24,
    gap: 10,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
