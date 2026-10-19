import { FlashList } from '@shopify/flash-list';
import { useIsPlaying } from '@rntp/player';
import type { ReactElement } from 'react';
import { useCallback } from 'react';
import { playTracks } from '../player/engine';
import { useCurrentKey } from '../player/hooks';
import type { Track } from '../types';
import { openTrackMenu } from '../ui/sheets';
import { TrackRow } from './TrackRow';

interface Props {
  tracks: Track[];
  header?: ReactElement | null;
  empty?: ReactElement | null;
  /** When the list is a playlist, the track menu offers "remove from playlist". */
  playlistId?: string;
  onPlayed?: () => void;
}

/** Virtualised track list: tapping a row plays the whole list from that row. */
export function TrackList({ tracks, header, empty, playlistId, onPlayed }: Props) {
  const currentKey = useCurrentKey();
  const isPlaying = useIsPlaying();

  const onPress = useCallback(
    (_: Track, index: number) => {
      playTracks(tracks, index);
      onPlayed?.();
    },
    [tracks, onPlayed],
  );
  const onMore = useCallback((t: Track) => openTrackMenu(t, playlistId), [playlistId]);

  return (
    <FlashList
      data={tracks}
      keyExtractor={(t) => t.key}
      extraData={`${currentKey}:${isPlaying}`}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({ item, index }) => (
        <TrackRow
          track={item}
          index={index}
          active={item.key === currentKey}
          playing={item.key === currentKey && isPlaying}
          onPress={onPress}
          onMore={onMore}
        />
      )}
    />
  );
}
