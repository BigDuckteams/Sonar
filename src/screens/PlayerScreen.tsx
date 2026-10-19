import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import TrackPlayer, { PlaybackState, useIsPlaying, usePlaybackState, useProgress } from '@rntp/player';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Cover } from '../components/Cover';
import { Screen } from '../components/Screen';
import { Badge, EmptyState, IconButton } from '../components/ui';
import { useRootNav } from '../nav';
import { setRepeat, setShuffle } from '../player/engine';
import { useCurrentTrack } from '../player/hooks';
import { useLibrary } from '../store/library';
import type { RepeatSetting } from '../store/library';
import { colors } from '../theme';
import { fmtClock } from '../util';
import { openPicker, openSleep, openSpeed } from '../ui/sheets';
import { toast } from '../ui/toast';

const NEXT_REPEAT: Record<RepeatSetting, RepeatSetting> = { off: 'all', all: 'one', one: 'off' };
const REPEAT_LABEL: Record<RepeatSetting, string> = {
  off: 'Повтор выключен',
  all: 'Повторять очередь',
  one: 'Повторять трек',
};

function Chipish(props: { icon: keyof typeof Ionicons.glyphMap; label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" style={styles.chip}>
      <Ionicons name={props.icon} size={18} color={props.on ? colors.accent : colors.text} />
      <Text style={[styles.chipText, props.on && { color: colors.accent }]}>{props.label}</Text>
    </Pressable>
  );
}

export function PlayerScreen() {
  const nav = useRootNav();
  const track = useCurrentTrack();
  const playing = useIsPlaying();
  const state = usePlaybackState();
  const progress = useProgress(0.5);
  const { width, height } = useWindowDimensions();

  const settings = useLibrary((s) => s.settings);
  const isFav = useLibrary((s) => (track ? s.favorites.some((t) => t.key === track.key) : false));
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);

  const [drag, setDrag] = useState<number | null>(null);
  const [sleeping, setSleeping] = useState(false);

  useEffect(() => {
    const tick = () => setSleeping(TrackPlayer.getSleepTimer() !== null);
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, []);

  if (!track) {
    return (
      <Screen>
        <View style={styles.top}>
          <IconButton name="chevron-down" label="Свернуть" onPress={() => nav.goBack()} />
        </View>
        <EmptyState icon="musical-notes-outline" title="Ничего не играет" text="Выберите трек на главной или в поиске." />
      </Screen>
    );
  }

  const duration = progress.duration > 0 ? progress.duration : (track.duration ?? 0);
  const position = drag ?? progress.position;
  const cover = Math.min(width - 56, height * 0.38);
  const buffering = state === PlaybackState.Buffering && !playing;

  const togglePlay = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (playing) TrackPlayer.pause();
    else TrackPlayer.play();
  };

  const previous = () => {
    if (progress.position > 3) TrackPlayer.seekTo(0);
    else TrackPlayer.skipToPrevious();
  };

  const sourceLabel =
    track.source === 'device' ? 'С телефона' : track.source === 'audius' ? 'Audius' : 'Apple · превью';

  return (
    <Screen>
      <View style={styles.top}>
        <IconButton name="chevron-down" label="Свернуть" onPress={() => nav.goBack()} />
        <Text style={styles.topTitle}>Сейчас играет</Text>
        <IconButton name="list" label="Очередь" onPress={() => nav.navigate('Queue')} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.coverWrap}>
          <Cover uri={track.artwork} seed={track.key} size={cover} radius={16} />
        </View>

        <View style={styles.info}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {track.title}
            </Text>
            <View style={styles.artistRow}>
              {track.preview ? <Badge text="ПРЕВЬЮ 30 С" /> : null}
              <Text style={styles.artist} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
            <Text style={styles.source}>{sourceLabel}</Text>
          </View>
          <IconButton
            name={isFav ? 'heart' : 'heart-outline'}
            color={isFav ? colors.danger : colors.text}
            label={isFav ? 'Убрать из избранного' : 'В избранное'}
            onPress={() => toast(toggleFavorite(track) ? 'Добавлено в избранное' : 'Убрано из избранного')}
          />
        </View>

        <View style={styles.sliderBlock}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(duration, 1)}
            value={position}
            disabled={duration <= 0}
            onValueChange={setDrag}
            onSlidingComplete={(v) => {
              TrackPlayer.seekTo(v);
              setDrag(null);
            }}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.text}
            accessibilityLabel="Перемотка"
          />
          <View style={styles.times}>
            <Text style={styles.time}>{fmtClock(position)}</Text>
            <Text style={styles.time}>{fmtClock(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <IconButton
            name="shuffle"
            size={26}
            color={settings.shuffle ? colors.accent : colors.muted}
            label={settings.shuffle ? 'Вперемешку включено' : 'Вперемешку выключено'}
            onPress={() => setShuffle(!settings.shuffle)}
          />
          <IconButton name="play-skip-back" size={32} label="Предыдущий" onPress={previous} />
          <Pressable
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Пауза' : 'Играть'}
            style={styles.play}
          >
            {buffering ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Ionicons name={playing ? 'pause' : 'play'} size={34} color={colors.bg} style={playing ? undefined : { marginLeft: 3 }} />
            )}
          </Pressable>
          <IconButton name="play-skip-forward" size={32} label="Следующий" onPress={() => TrackPlayer.skipToNext()} />
          <View>
            <IconButton
              name="repeat"
              size={26}
              color={settings.repeat === 'off' ? colors.muted : colors.accent}
              label={REPEAT_LABEL[settings.repeat]}
              onPress={() => {
                const next = NEXT_REPEAT[settings.repeat];
                setRepeat(next);
                toast(REPEAT_LABEL[next]);
              }}
            />
            {settings.repeat === 'one' ? <Text style={styles.one}>1</Text> : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.extras}>
          <Chipish
            icon="speedometer-outline"
            label={settings.speed === 1 ? 'Скорость' : `${settings.speed}×`}
            on={settings.speed !== 1}
            onPress={openSpeed}
          />
          <Chipish icon="moon-outline" label="Таймер сна" on={sleeping} onPress={openSleep} />
          <Chipish icon="albums-outline" label="В плейлист" onPress={() => openPicker([track])} />
          {track.link ? (
            <>
              <Chipish
                icon="share-outline"
                label="Поделиться"
                onPress={() => void Share.share({ message: `${track.artist} — ${track.title}\n${track.link}` })}
              />
              <Chipish icon="open-outline" label="Открыть" onPress={() => void Linking.openURL(track.link!)} />
            </>
          ) : null}
        </ScrollView>

        {track.preview ? (
          <Text style={styles.previewNote}>
            Это 30-секундное превью: полные версии коммерческих песен бесплатно недоступны. Полные треки
            независимых артистов ищите в разделе «В тренде».
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  topTitle: { color: colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  body: { paddingHorizontal: 24, paddingBottom: 32 },
  coverWrap: { alignItems: 'center', marginTop: 12, marginBottom: 24 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  artistRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  artist: { color: colors.muted, fontSize: 16, flexShrink: 1 },
  source: { color: colors.faint, fontSize: 12, marginTop: 4 },
  sliderBlock: { marginTop: 16 },
  slider: { width: '100%', height: 40 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  time: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  play: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  one: { position: 'absolute', right: 10, top: 10, color: colors.accent, fontSize: 10, fontWeight: '800' },
  extras: { gap: 10, paddingVertical: 24 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
  },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  previewNote: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
