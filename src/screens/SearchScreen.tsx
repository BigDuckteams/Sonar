import { Ionicons } from '@expo/vector-icons';
import { useIsPlaying } from '@rntp/player';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { playTracks } from '../player/engine';
import { useCurrentKey } from '../player/hooks';
import * as Audius from '../sources/audius';
import * as ITunes from '../sources/itunes';
import { useDevice } from '../store/device';
import { useLibrary } from '../store/library';
import { colors, radius } from '../theme';
import type { Page, Track } from '../types';
import { filterTracks } from '../util';
import { openTrackMenu } from '../ui/sheets';

type Filter = 'all' | 'device' | 'audius' | 'itunes';

const EMPTY: Page = { items: [], more: false, next: 0 };
const IDEAS = ['lofi', 'jazz', 'ambient', 'house', 'Daft Punk', 'Imagine Dragons', 'Кино', 'Мумий Тролль'];
const PREVIEW_NOTE =
  'Полные версии коммерческих песен бесплатно недоступны — здесь только 30-секундные превью.';

interface SectionProps {
  title: string;
  note?: string;
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
        {props.note ? <Text style={styles.note}>{props.note}</Text> : null}
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
  const itunes = usePaged(
    (_, signal) => (q ? ITunes.search(q, 25, signal) : Promise.resolve(EMPTY)),
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
  const nothing =
    !!q &&
    !audius.loading &&
    !itunes.loading &&
    deviceHits.length === 0 &&
    audius.items.length === 0 &&
    itunes.items.length === 0;

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
          <Chip label="Превью хитов" selected={filter === 'itunes'} onPress={() => setFilter('itunes')} />
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
              Sonar ищет сразу в трёх местах: в музыке на вашем телефоне, среди полных треков Audius и
              среди превью хитов. {PREVIEW_NOTE}
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
            {all || filter === 'itunes' ? (
              <Section
                title="Хиты · превью 30 секунд"
                note={PREVIEW_NOTE}
                tracks={itunes.items}
                loading={itunes.loading}
                error={itunes.error}
                limit={all ? 5 : undefined}
                onAll={() => setFilter('itunes')}
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
                title="Ничего не найдено"
                text="Проверьте написание или попробуйте латиницей."
              />
            ) : null}
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
  note: { color: colors.muted, fontSize: 13 },
});
