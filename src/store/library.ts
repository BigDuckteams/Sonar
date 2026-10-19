import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Playlist, Track } from '../types';

export type RepeatSetting = 'off' | 'all' | 'one';

export interface Settings {
  /** Keep playing similar Audius tracks when the queue runs out. */
  autoplay: boolean;
  shuffle: boolean;
  repeat: RepeatSetting;
  speed: number;
  notifAsked: boolean;
}

export interface PlayStat {
  track: Track;
  count: number;
  last: number;
}

interface LibraryState {
  favorites: Track[];
  playlists: Playlist[];
  history: Track[];
  stats: Record<string, PlayStat>;
  recentSearches: string[];
  settings: Settings;

  /** Returns true when the track is a favorite after the call. */
  toggleFavorite: (track: Track) => boolean;
  createPlaylist: (name: string, tracks?: Track[]) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  /** Returns how many tracks were actually added (duplicates are skipped). */
  addToPlaylist: (id: string, tracks: Track[]) => number;
  removeFromPlaylist: (id: string, key: string) => void;
  recordPlay: (track: Track) => void;
  clearHistory: () => void;
  pushSearch: (query: string) => void;
  clearSearches: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const HISTORY_LIMIT = 60;
const STATS_LIMIT = 400;

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      playlists: [],
      history: [],
      stats: {},
      recentSearches: [],
      settings: { autoplay: true, shuffle: false, repeat: 'off', speed: 1, notifAsked: false },

      toggleFavorite: (track) => {
        const has = get().favorites.some((t) => t.key === track.key);
        set((s) => ({
          favorites: has
            ? s.favorites.filter((t) => t.key !== track.key)
            : [track, ...s.favorites],
        }));
        return !has;
      },

      createPlaylist: (name, tracks = []) => {
        const id = newId();
        const seen = new Set<string>();
        const unique = tracks.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)));
        set((s) => ({
          playlists: [
            { id, name: name.trim() || 'Новый плейлист', createdAt: Date.now(), tracks: unique },
            ...s.playlists,
          ],
        }));
        return id;
      },

      renamePlaylist: (id, name) =>
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
        })),

      deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),

      addToPlaylist: (id, tracks) => {
        let added = 0;
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== id) return p;
            const have = new Set(p.tracks.map((t) => t.key));
            const fresh = tracks.filter((t) => (have.has(t.key) ? false : (have.add(t.key), true)));
            added = fresh.length;
            return { ...p, tracks: [...p.tracks, ...fresh] };
          }),
        }));
        return added;
      },

      removeFromPlaylist: (id, key) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, tracks: p.tracks.filter((t) => t.key !== key) } : p,
          ),
        })),

      recordPlay: (track) =>
        set((s) => {
          const prev = s.stats[track.key];
          let stats = { ...s.stats, [track.key]: { track, count: (prev?.count ?? 0) + 1, last: Date.now() } };
          const keys = Object.keys(stats);
          if (keys.length > STATS_LIMIT + 100) {
            const keep = keys
              .sort((a, b) => stats[b].last - stats[a].last)
              .slice(0, STATS_LIMIT);
            stats = Object.fromEntries(keep.map((k) => [k, stats[k]]));
          }
          const history = [track, ...s.history.filter((t) => t.key !== track.key)].slice(0, HISTORY_LIMIT);
          return { stats, history };
        }),

      clearHistory: () => set({ history: [], stats: {} }),

      pushSearch: (query) => {
        const q = query.trim();
        if (!q) return;
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8),
        }));
      },

      clearSearches: () => set({ recentSearches: [] }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'sonar-library',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Most played tracks first. */
export function topTracks(stats: Record<string, PlayStat>, limit = 50): Track[] {
  return Object.values(stats)
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map((s) => s.track);
}
