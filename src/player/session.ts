import TrackPlayer, { Event, PlaybackState } from '@rntp/player';
import { useLibrary } from '../store/library';
import { extendQueue, itemToTrack, setupEngine } from './engine';

/**
 * Playback-critical listeners live here, not in components: they keep working when
 * the UI is gone (app swiped away while the music continues).
 * Must stay free of UI imports.
 */
const COUNT_AFTER_MS = 12_000;

export function registerSession() {
  TrackPlayer.registerPlaybackSession(() => {
    setupEngine();

    // A play only counts once the track has actually been listened to for a moment.
    let pending: ReturnType<typeof setTimeout> | undefined;
    TrackPlayer.addEventListener(Event.MediaItemTransition, ({ item }) => {
      if (pending) clearTimeout(pending);
      const track = itemToTrack(item);
      if (!track) return;
      pending = setTimeout(() => {
        const current = TrackPlayer.getActiveMediaItem();
        if (current?.mediaId === track.key && TrackPlayer.isPlaying()) {
          useLibrary.getState().recordPlay(track);
        }
      }, COUNT_AFTER_MS);
    });

    TrackPlayer.addEventListener(Event.PlaybackStateChanged, ({ state }) => {
      if (state === PlaybackState.Ended) return extendQueue();
    });

    // A dead link or a deleted file should not stop the whole queue.
    let streak = 0;
    let lastError = 0;
    TrackPlayer.addEventListener(Event.PlaybackError, () => {
      const now = Date.now();
      streak = now - lastError < 15_000 ? streak + 1 : 1;
      lastError = now;
      if (streak <= 4) {
        TrackPlayer.skipToNext();
        TrackPlayer.play();
      }
    });
  });
}
