export type Source = 'audius' | 'device';

export interface Track {
  /** Stable unique id: `<source>:<id>` */
  key: string;
  source: Source;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  /** Seconds. A hint for the UI; the player reports the real value. */
  duration?: number;
  /** Playable URL (https, or content:// for files on the phone). */
  url: string;
  /** Public page of the track at its source, if any. */
  link?: string;
  genre?: string;
  /** Device tracks: folder the file lives in. */
  folder?: string;
  /** Device tracks: unix seconds when the file was added. */
  addedAt?: number;
  /** Device tracks: track number from the embedded tags, when the file has one. */
  trackNo?: number;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  tracks: Track[];
}

export interface Page {
  items: Track[];
  more: boolean;
  /** Offset to request for the next page. */
  next: number;
}

export type CollectionKind = 'playlist' | 'favorites' | 'history' | 'top' | 'folder' | 'artist';

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Library: { segment?: 'device' | 'favorites' | 'playlists' } | undefined;
  /** `nonce` makes a repeated search for the same words still reload the page. */
  YouTube: { query?: string; nonce?: number } | undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Player: undefined;
  Queue: undefined;
  Settings: undefined;
  Collection: { kind: CollectionKind; title: string; id?: string; name?: string };
};
