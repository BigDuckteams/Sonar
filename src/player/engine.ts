import TrackPlayer, { PlayerCommand, RepeatMode } from '@rntp/player';
import type { MediaItem } from '@rntp/player';
import { PermissionsAndroid, Platform } from 'react-native';
import * as Audius from '../sources/audius';
import { useLibrary } from '../store/library';
import type { RepeatSetting, Settings } from '../store/library';
import type { Source, Track } from '../types';

/**
 * The native player owns the queue: next/previous, lock-screen controls and
 * background playback all work without JS. Everything here just feeds it.
 */

const SOURCES: Source[] = ['audius', 'device'];

export function trackToItem(t: Track): MediaItem {
  return {
    mediaId: t.key,
    url: t.url,
    title: t.title,
    artist: t.artist,
    albumTitle: t.album,
    artworkUrl: t.artwork,
    duration: t.duration,
    extras: { track: t },
  };
}

function isTrack(v: unknown): v is Track {
  return typeof v === 'object' && v !== null && 'key' in v && 'url' in v && 'title' in v;
}

export function itemToTrack(item: MediaItem | null | undefined): Track | null {
  if (!item) return null;
  const stored = item.extras?.track;
  if (isTrack(stored)) return stored;
  const url = typeof item.url === 'string' ? item.url : '';
  const key = item.mediaId ?? url;
  const prefix = key.split(':')[0] as Source;
  return {
    key,
    source: SOURCES.includes(prefix) ? prefix : 'device',
    title: item.title ?? 'Без названия',
    artist: item.artist ?? '',
    album: item.albumTitle,
    artwork: typeof item.artworkUrl === 'string' ? item.artworkUrl : undefined,
    duration: item.duration,
    url,
  };
}

/** Call once, from inside registerPlaybackSession. */
export function setupEngine() {
  TrackPlayer.setupPlayer({
    contentType: 'music',
    handleAudioBecomingNoisy: true,
    android: { wakeMode: 'network', taskRemovedBehavior: 'continue' },
  });
  TrackPlayer.setCommands({
    capabilities: [
      PlayerCommand.PlayPause,
      PlayerCommand.Next,
      PlayerCommand.Previous,
      PlayerCommand.Seek,
    ],
  });
}

const REPEAT: Record<RepeatSetting, RepeatMode> = {
  off: RepeatMode.Off,
  all: RepeatMode.All,
  one: RepeatMode.One,
};

export function setRepeat(mode: RepeatSetting) {
  TrackPlayer.setRepeatMode(REPEAT[mode]);
  useLibrary.getState().updateSettings({ repeat: mode });
}

export function setShuffle(on: boolean) {
  TrackPlayer.setShuffleEnabled(on);
  useLibrary.getState().updateSettings({ shuffle: on });
}

export function setSpeed(speed: number) {
  TrackPlayer.setPlaybackSpeed(speed);
  useLibrary.getState().updateSettings({ speed });
}

/** Re-apply the saved preferences to a freshly started player. */
export function applySettings(s: Settings) {
  TrackPlayer.setRepeatMode(REPEAT[s.repeat]);
  TrackPlayer.setShuffleEnabled(s.shuffle);
  TrackPlayer.setPlaybackSpeed(s.speed);
}

async function askNotificationPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  const { settings, updateSettings } = useLibrary.getState();
  if (settings.notifAsked) return;
  updateSettings({ notifAsked: true });
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // playback works without the notification permission
  }
}

const MAX_QUEUE = 800;

/** Replace the queue with `tracks` and start playing at `index`. */
export function playTracks(tracks: Track[], index = 0, opts: { shuffle?: boolean } = {}) {
  if (!tracks.length) return;
  let list = tracks;
  let start = Math.min(Math.max(index, 0), tracks.length - 1);
  if (list.length > MAX_QUEUE) {
    const from = Math.max(0, Math.min(start - 100, list.length - MAX_QUEUE));
    list = list.slice(from, from + MAX_QUEUE);
    start -= from;
  }
  TrackPlayer.setMediaItems(list.map(trackToItem), start);
  if (opts.shuffle !== undefined) setShuffle(opts.shuffle);
  TrackPlayer.play();
  void askNotificationPermission();
}

export function playShuffled(tracks: Track[]) {
  if (!tracks.length) return;
  playTracks(tracks, Math.floor(Math.random() * tracks.length), { shuffle: true });
}

export function playNext(track: Track) {
  const index = TrackPlayer.getActiveMediaItemIndex();
  if (index === null || TrackPlayer.getQueue().length === 0) playTracks([track]);
  else TrackPlayer.insertMediaItem(index + 1, trackToItem(track));
}

export function addToQueue(track: Track) {
  if (TrackPlayer.getQueue().length === 0) playTracks([track]);
  else TrackPlayer.addMediaItem(trackToItem(track));
}

let extending = false;

/**
 * When the queue ends after an Audius track, keep going with trending tracks of the
 * same genre so the music does not just stop (can be switched off in settings).
 */
export async function extendQueue(): Promise<void> {
  if (extending || !useLibrary.getState().settings.autoplay) return;
  const queue = TrackPlayer.getQueue();
  const last = itemToTrack(queue[queue.length - 1]);
  if (!last || last.source !== 'audius') return;
  extending = true;
  try {
    const offset = Math.floor(Math.random() * 30);
    let page = await Audius.trending({ genre: last.genre, limit: 30, offset });
    if (!page.items.length && last.genre) page = await Audius.trending({ limit: 30, offset });
    const have = new Set(queue.map((i) => i.mediaId));
    const fresh = page.items.filter((t) => !have.has(t.key));
    if (!fresh.length) return;
    TrackPlayer.addMediaItems(fresh.map(trackToItem));
    TrackPlayer.skipToIndex(queue.length);
    TrackPlayer.play();
  } catch {
    // offline or rate-limited: stay silent, the user can pick something else
  } finally {
    extending = false;
  }
}
