import TrackPlayer, { Event, useActiveMediaItem } from '@rntp/player';
import type { MediaItem } from '@rntp/player';
import { useEffect, useMemo, useState } from 'react';
import type { Track } from '../types';
import { itemToTrack } from './engine';

export function useCurrentTrack(): Track | null {
  const item = useActiveMediaItem();
  return useMemo(() => itemToTrack(item), [item]);
}

/** Key of the current track; a cheap primitive for rows that only need "am I playing". */
export function useCurrentKey(): string | null {
  const item = useActiveMediaItem();
  return item?.mediaId ?? (typeof item?.url === 'string' ? item.url : null);
}

interface QueueSnapshot {
  items: MediaItem[];
  index: number | null;
}

const snapshot = (): QueueSnapshot => ({
  items: TrackPlayer.getQueue(),
  index: TrackPlayer.getActiveMediaItemIndex(),
});

/** Live view of the native queue. */
export function useQueue(): QueueSnapshot {
  const [state, setState] = useState<QueueSnapshot>(snapshot);

  useEffect(() => {
    const refresh = () => setState(snapshot());
    const subs = [
      TrackPlayer.addEventListener(Event.QueueChanged, refresh),
      TrackPlayer.addEventListener(Event.MediaItemTransition, refresh),
    ];
    refresh();
    return () => subs.forEach((s) => s.remove());
  }, []);

  return state;
}
