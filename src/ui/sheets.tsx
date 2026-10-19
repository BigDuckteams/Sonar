import { Ionicons } from '@expo/vector-icons';
import TrackPlayer from '@rntp/player';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Cover } from '../components/Cover';
import { addToQueue, playNext, setSpeed } from '../player/engine';
import { useLibrary } from '../store/library';
import { colors, radius } from '../theme';
import type { Track } from '../types';
import { countTracks } from '../util';
import { askText } from './prompt';
import { toast } from './toast';

type IconName = keyof typeof Ionicons.glyphMap;

interface SheetState {
  menu: { track: Track; playlistId?: string } | null;
  picker: Track[] | null;
  sleep: boolean;
  speed: boolean;
}

const none: SheetState = { menu: null, picker: null, sleep: false, speed: false };
const useSheets = create<SheetState>(() => none);

const close = () => useSheets.setState(none);
export const openTrackMenu = (track: Track, playlistId?: string) =>
  useSheets.setState({ ...none, menu: { track, playlistId } });
export const openPicker = (tracks: Track[]) => useSheets.setState({ ...none, picker: tracks });
export const openSleep = () => useSheets.setState({ ...none, sleep: true });
export const openSpeed = () => useSheets.setState({ ...none, speed: true });

function BottomSheet({ visible, children }: { visible: boolean; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Закрыть" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.grab} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

function Row(props: {
  icon: IconName;
  label: string;
  sub?: string;
  danger?: boolean;
  selected?: boolean;
  onPress: () => void;
}) {
  const color = props.danger ? colors.danger : props.selected ? colors.accent : colors.text;
  return (
    <Pressable onPress={props.onPress} android_ripple={{ color: '#ffffff14' }} style={styles.row}>
      <Ionicons name={props.icon} size={22} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color }]}>{props.label}</Text>
        {props.sub ? <Text style={styles.rowSub}>{props.sub}</Text> : null}
      </View>
      {props.selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
    </Pressable>
  );
}

function Title({ text }: { text: string }) {
  return <Text style={styles.title}>{text}</Text>;
}

function TrackMenu({ track, playlistId }: { track: Track; playlistId?: string }) {
  const isFav = useLibrary((s) => s.favorites.some((t) => t.key === track.key));
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const sourceName = 'Audius';

  return (
    <>
      <View style={styles.menuHead}>
        <Cover uri={track.artwork} seed={track.key} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.menuTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
      </View>
      <Row
        icon="play-forward-outline"
        label="Играть следующим"
        onPress={() => {
          close();
          playNext(track);
          toast('Сыграет следующим');
        }}
      />
      <Row
        icon="list-outline"
        label="Добавить в очередь"
        onPress={() => {
          close();
          addToQueue(track);
          toast('Добавлено в очередь');
        }}
      />
      <Row
        icon={isFav ? 'heart' : 'heart-outline'}
        label={isFav ? 'Убрать из избранного' : 'В избранное'}
        selected={isFav}
        onPress={() => {
          close();
          toast(toggleFavorite(track) ? 'Добавлено в избранное' : 'Убрано из избранного');
        }}
      />
      <Row icon="albums-outline" label="Добавить в плейлист" onPress={() => openPicker([track])} />
      {playlistId ? (
        <Row
          icon="trash-outline"
          label="Убрать из плейлиста"
          danger
          onPress={() => {
            close();
            removeFromPlaylist(playlistId, track.key);
          }}
        />
      ) : null}
      {track.link ? (
        <>
          <Row
            icon="open-outline"
            label={`Открыть в ${sourceName}`}
            onPress={() => {
              close();
              void Linking.openURL(track.link!);
            }}
          />
          <Row
            icon="share-outline"
            label="Поделиться"
            onPress={() => {
              close();
              void Share.share({ message: `${track.artist} — ${track.title}\n${track.link}` });
            }}
          />
        </>
      ) : null}
    </>
  );
}

function PlaylistPicker({ tracks }: { tracks: Track[] }) {
  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);

  return (
    <>
      <Title text="Добавить в плейлист" />
      <Row
        icon="add-circle-outline"
        label="Новый плейлист"
        onPress={async () => {
          close();
          const name = await askText({ title: 'Новый плейлист', confirmLabel: 'Создать' });
          if (name) {
            createPlaylist(name, tracks);
            toast(`Плейлист «${name}» создан`);
          }
        }}
      />
      <ScrollView style={{ maxHeight: 320 }}>
        {playlists.map((p) => (
          <Row
            key={p.id}
            icon="musical-notes-outline"
            label={p.name}
            sub={countTracks(p.tracks.length)}
            onPress={() => {
              close();
              const added = addToPlaylist(p.id, tracks);
              toast(added ? `Добавлено в «${p.name}»` : 'Этот трек уже в плейлисте');
            }}
          />
        ))}
      </ScrollView>
    </>
  );
}

const SLEEP_MINUTES = [5, 10, 15, 30, 45, 60];

function SleepTimer() {
  const [active, setActive] = useState(() => TrackPlayer.getSleepTimer());

  useEffect(() => {
    const t = setInterval(() => setActive(TrackPlayer.getSleepTimer()), 1000);
    return () => clearInterval(t);
  }, []);

  const left =
    active?.type === 'time'
      ? `Осталось ${Math.max(1, Math.ceil(active.remainingSeconds / 60))} мин`
      : active?.type === 'mediaItem'
        ? 'Выключится после этого трека'
        : null;

  return (
    <>
      <Title text="Таймер сна" />
      {left ? (
        <Row
          icon="close-circle-outline"
          label="Выключить таймер"
          sub={left}
          danger
          onPress={() => {
            TrackPlayer.cancelSleepTimer();
            close();
            toast('Таймер выключен');
          }}
        />
      ) : null}
      {SLEEP_MINUTES.map((m) => (
        <Row
          key={m}
          icon="moon-outline"
          label={`${m} минут`}
          onPress={() => {
            TrackPlayer.sleepAfterTime(m * 60, { fadeOutSeconds: 10 });
            close();
            toast(`Музыка затихнет через ${m} мин`);
          }}
        />
      ))}
      <Row
        icon="musical-note-outline"
        label="После этого трека"
        onPress={() => {
          TrackPlayer.sleepAfterMediaItemAtIndex();
          close();
          toast('Музыка остановится после этого трека');
        }}
      />
    </>
  );
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function SpeedPicker() {
  const speed = useLibrary((s) => s.settings.speed);
  return (
    <>
      <Title text="Скорость воспроизведения" />
      {SPEEDS.map((v) => (
        <Row
          key={v}
          icon="speedometer-outline"
          label={v === 1 ? 'Обычная (1×)' : `${v}×`}
          selected={v === speed}
          onPress={() => {
            setSpeed(v);
            close();
          }}
        />
      ))}
    </>
  );
}

/** Mounted once at the root; screens open sheets through the `open*` helpers. */
export function SheetHost() {
  const { menu, picker, sleep, speed } = useSheets();
  return (
    <>
      <BottomSheet visible={!!menu}>
        {menu ? <TrackMenu track={menu.track} playlistId={menu.playlistId} /> : null}
      </BottomSheet>
      <BottomSheet visible={!!picker}>{picker ? <PlaylistPicker tracks={picker} /> : null}</BottomSheet>
      <BottomSheet visible={sleep}>{sleep ? <SleepTimer /> : null}</BottomSheet>
      <BottomSheet visible={speed}>{speed ? <SpeedPicker /> : null}</BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 8,
    maxHeight: '85%',
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 8 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 1 },
  menuHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  menuTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
