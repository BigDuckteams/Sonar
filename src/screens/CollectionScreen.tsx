import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useMemo } from 'react';
import { Alert, Share } from 'react-native';
import { PlayButtons } from '../components/PlayButtons';
import { Screen } from '../components/Screen';
import { TrackList } from '../components/TrackList';
import { EmptyState, Header, IconButton } from '../components/ui';
import { useRootNav } from '../nav';
import { useDevice } from '../store/device';
import { topTracks, useLibrary } from '../store/library';
import type { RootStackParamList } from '../types';
import { countTracks } from '../util';
import { askText } from '../ui/prompt';

/** One screen for every list of tracks you can open: playlist, history, a folder, an artist… */
export function CollectionScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Collection'>>();
  const { kind, id, name, title } = params;
  const nav = useRootNav();

  const playlists = useLibrary((s) => s.playlists);
  const favorites = useLibrary((s) => s.favorites);
  const history = useLibrary((s) => s.history);
  const stats = useLibrary((s) => s.stats);
  const renamePlaylist = useLibrary((s) => s.renamePlaylist);
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);
  const deviceTracks = useDevice((s) => s.tracks);

  const playlist = kind === 'playlist' ? playlists.find((p) => p.id === id) : undefined;

  const tracks = useMemo(() => {
    switch (kind) {
      case 'playlist':
        return playlist?.tracks ?? [];
      case 'favorites':
        return favorites;
      case 'history':
        return history;
      case 'top':
        return topTracks(stats, 100);
      case 'folder':
        return deviceTracks.filter((t) => (t.folder ?? 'Без папки') === name);
      case 'artist':
        return deviceTracks.filter((t) => t.artist === name);
    }
  }, [kind, playlist, favorites, history, stats, deviceTracks, name]);

  const missing = kind === 'playlist' && !playlist;

  const rename = async () => {
    if (!playlist) return;
    const next = await askText({ title: 'Переименовать плейлист', initial: playlist.name });
    if (next) renamePlaylist(playlist.id, next);
  };

  const remove = () => {
    if (!playlist) return;
    Alert.alert('Удалить плейлист?', `«${playlist.name}» исчезнет. Сами треки останутся на своих местах.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deletePlaylist(playlist.id);
          nav.goBack();
        },
      },
    ]);
  };

  const share = () => {
    if (!playlist) return;
    const lines = playlist.tracks.map((t, i) => `${i + 1}. ${t.artist} — ${t.title}`);
    void Share.share({ message: `${playlist.name}\n\n${lines.join('\n')}` });
  };

  return (
    <Screen mini>
      <Header
        back
        title={playlist?.name ?? title}
        subtitle={missing ? undefined : countTracks(tracks.length)}
        right={
          playlist ? (
            <>
              <IconButton name="share-outline" label="Поделиться списком" onPress={share} />
              <IconButton name="create-outline" label="Переименовать" onPress={() => void rename()} />
              <IconButton name="trash-outline" label="Удалить плейлист" onPress={remove} />
            </>
          ) : null
        }
      />
      {missing ? (
        <EmptyState icon="albums-outline" title="Плейлист не найден" />
      ) : (
        <TrackList
          tracks={tracks}
          playlistId={playlist?.id}
          header={tracks.length ? <PlayButtons tracks={tracks} /> : null}
          empty={
            <EmptyState
              icon="musical-notes-outline"
              title="Здесь пусто"
              text={
                kind === 'playlist'
                  ? 'Добавляйте треки через меню ⋮ → «Добавить в плейлист».'
                  : 'Когда появятся треки, они будут здесь.'
              }
            />
          }
        />
      )}
    </Screen>
  );
}
