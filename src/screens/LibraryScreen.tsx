import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Cover } from '../components/Cover';
import { PlayButtons } from '../components/PlayButtons';
import { Screen } from '../components/Screen';
import { TrackList } from '../components/TrackList';
import { Button, Chip, EmptyState, Header, IconButton, Segmented } from '../components/ui';
import { useRootNav } from '../nav';
import { useDevice } from '../store/device';
import { useLibrary } from '../store/library';
import { colors, radius } from '../theme';
import type { TabParamList } from '../types';
import { countTracks, filterTracks } from '../util';
import { askText } from '../ui/prompt';
import { toast } from '../ui/toast';

type Segment = 'device' | 'favorites' | 'playlists';
type DeviceView = 'tracks' | 'folders' | 'artists';
type Sort = 'new' | 'title' | 'artist';

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

function groupCount<T>(items: T[], by: (t: T) => string) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = by(it);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

function Busy({ text }: { text: string }) {
  return (
    <View style={styles.busy}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.busyText}>{text}</Text>
    </View>
  );
}

function DeviceTab() {
  const device = useDevice();
  const root = useRootNav();
  const [view, setView] = useState<DeviceView>('tracks');
  const [sort, setSort] = useState<Sort>('new');
  const [filter, setFilter] = useState('');

  const tracks = useMemo(() => {
    const found = filterTracks(device.tracks, filter);
    if (sort === 'new') return found;
    return found
      .slice()
      .sort((a, b) =>
        sort === 'title'
          ? collator.compare(a.title, b.title)
          : collator.compare(a.artist, b.artist) || collator.compare(a.title, b.title),
      );
  }, [device.tracks, filter, sort]);

  const folders = useMemo(() => groupCount(device.tracks, (t) => t.folder ?? 'Без папки'), [device.tracks]);
  const artists = useMemo(() => groupCount(device.tracks, (t) => t.artist), [device.tracks]);

  switch (device.status) {
    case 'unsupported':
      return (
        <EmptyState
          icon="phone-portrait-outline"
          title="Только на Android"
          text="Музыка с телефона доступна в Android-версии Sonar."
        />
      );
    case 'idle':
    case 'checking':
      return <Busy text="Проверяем доступ…" />;
    case 'scanning':
      return <Busy text="Ищем музыку на телефоне…" />;
    case 'needs-permission':
    case 'denied':
      return (
        <EmptyState
          icon="musical-notes-outline"
          title="Покажем вашу скачанную музыку"
          text="Разрешите Sonar доступ к аудиофайлам. Они остаются на телефоне и никуда не отправляются."
          actionLabel="Разрешить доступ"
          onAction={() => void device.request()}
        />
      );
    case 'blocked':
      return (
        <EmptyState
          icon="lock-closed-outline"
          title="Доступ к музыке выключен"
          text="Включите разрешение для аудио в настройках приложения."
          actionLabel="Открыть настройки"
          onAction={() => void Linking.openSettings()}
        />
      );
    case 'error':
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Не удалось прочитать музыку"
          text={device.error}
          actionLabel="Повторить"
          onAction={() => void device.rescan()}
        />
      );
    case 'ready':
      break;
  }

  if (device.tracks.length === 0) {
    return (
      <EmptyState
        icon="folder-open-outline"
        title="Аудиофайлов не найдено"
        text="Скачайте музыку на телефон — и она появится здесь."
        actionLabel="Обновить"
        onAction={() => void device.rescan()}
      />
    );
  }

  const switcher = (
    <View style={styles.pad}>
      <Segmented<DeviceView>
        value={view}
        onChange={setView}
        options={[
          { id: 'tracks', label: `Треки ${device.tracks.length}` },
          { id: 'folders', label: `Папки ${folders.length}` },
          { id: 'artists', label: `Исполнители ${artists.length}` },
        ]}
      />
    </View>
  );

  if (view !== 'tracks') {
    const rows = view === 'folders' ? folders : artists;
    return (
      <View style={{ flex: 1 }}>
        {switcher}
        <FlashList
          data={rows}
          keyExtractor={(r) => r.name}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                root.navigate('Collection', {
                  kind: view === 'folders' ? 'folder' : 'artist',
                  name: item.name,
                  title: item.name,
                })
              }
              android_ripple={{ color: '#ffffff14' }}
              style={styles.groupRow}
            >
              {view === 'folders' ? (
                <View style={styles.groupIcon}>
                  <Ionicons name="folder" size={22} color={colors.accent} />
                </View>
              ) : (
                <Cover seed={item.name} size={44} radius={22} />
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.groupName}>
                  {item.name}
                </Text>
                <Text style={styles.groupCount}>{countTracks(item.count)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          )}
        />
      </View>
    );
  }

  const header = (
    <View>
      {switcher}
      <View style={[styles.pad, { marginTop: 12 }]}>
        <View style={styles.filter}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Фильтр по моей музыке"
            placeholderTextColor={colors.faint}
            style={styles.filterInput}
            autoCorrect={false}
          />
          {filter ? (
            <Pressable onPress={() => setFilter('')} hitSlop={10} accessibilityLabel="Очистить">
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        <Chip label="Новые" selected={sort === 'new'} onPress={() => setSort('new')} />
        <Chip label="По названию" selected={sort === 'title'} onPress={() => setSort('title')} />
        <Chip label="По исполнителю" selected={sort === 'artist'} onPress={() => setSort('artist')} />
        <IconButton name="refresh" label="Обновить список" size={20} onPress={() => void device.rescan()} />
      </ScrollView>
      <PlayButtons tracks={tracks} />
    </View>
  );

  return (
    <TrackList
      tracks={tracks}
      header={header}
      empty={<EmptyState icon="search-outline" title="Ничего не нашлось" text="Измените запрос." />}
    />
  );
}

function FavoritesTab() {
  const favorites = useLibrary((s) => s.favorites);
  return (
    <TrackList
      tracks={favorites}
      header={favorites.length ? <PlayButtons tracks={favorites} /> : null}
      empty={
        <EmptyState
          icon="heart-outline"
          title="Здесь будут любимые треки"
          text="Нажмите ⋮ у трека и выберите «В избранное», или сердечко в плеере."
        />
      }
    />
  );
}

function PlaylistsTab() {
  const playlists = useLibrary((s) => s.playlists);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const root = useRootNav();

  const create = async () => {
    const name = await askText({ title: 'Новый плейлист', confirmLabel: 'Создать' });
    if (name) {
      createPlaylist(name);
      toast(`Плейлист «${name}» создан`);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.pad}>
        <View style={{ marginVertical: 12 }}>
          <Button label="Новый плейлист" icon="add" onPress={() => void create()} />
        </View>
      </View>
      {playlists.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title="Плейлистов пока нет"
          text="Собирайте свои подборки из любых источников: телефон, Audius, превью."
        />
      ) : null}
      {playlists.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => root.navigate('Collection', { kind: 'playlist', id: p.id, title: p.name })}
          android_ripple={{ color: '#ffffff14' }}
          style={styles.groupRow}
        >
          <Cover uri={p.tracks[0]?.artwork} seed={p.id} size={52} radius={10} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.groupName}>
              {p.name}
            </Text>
            <Text style={styles.groupCount}>{countTracks(p.tracks.length)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function LibraryScreen() {
  const route = useRoute<RouteProp<TabParamList, 'Library'>>();
  const [segment, setSegment] = useState<Segment>(route.params?.segment ?? 'device');
  const requested = route.params?.segment;
  const favCount = useLibrary((s) => s.favorites.length);
  const plCount = useLibrary((s) => s.playlists.length);

  useEffect(() => {
    if (requested) setSegment(requested);
  }, [requested]);

  return (
    <Screen>
      <Header title="Медиатека" />
      <View style={[styles.pad, { marginBottom: 8 }]}>
        <Segmented<Segment>
          value={segment}
          onChange={setSegment}
          options={[
            { id: 'device', label: 'На телефоне' },
            { id: 'favorites', label: favCount ? `Избранное ${favCount}` : 'Избранное' },
            { id: 'playlists', label: plCount ? `Плейлисты ${plCount}` : 'Плейлисты' },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {segment === 'device' ? <DeviceTab /> : segment === 'favorites' ? <FavoritesTab /> : <PlaylistsTab />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  busy: { alignItems: 'center', gap: 12, paddingVertical: 56 },
  busyText: { color: colors.muted, fontSize: 14 },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 42,
  },
  filterInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 0 },
  sortRow: { paddingHorizontal: 16, gap: 8, paddingTop: 12, alignItems: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 9 },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  groupCount: { color: colors.muted, fontSize: 13, marginTop: 1 },
});
