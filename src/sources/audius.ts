import type { Page, Track } from '../types';

/**
 * Audius: an open streaming platform where independent artists publish full tracks.
 * The public API needs no account and no key, only an app name.
 */
const BASE = 'https://api.audius.co/v1';
const APP = 'sonar_player';

export const GENRES: { id: string; label: string }[] = [
  { id: '', label: 'Все' },
  { id: 'Electronic', label: 'Электроника' },
  { id: 'Hip-Hop/Rap', label: 'Хип-хоп' },
  { id: 'Pop', label: 'Поп' },
  { id: 'Rock', label: 'Рок' },
  { id: 'Lo-Fi', label: 'Lo-Fi' },
  { id: 'Ambient', label: 'Эмбиент' },
  { id: 'Jazz', label: 'Джаз' },
  { id: 'House', label: 'Хаус' },
  { id: 'Techno', label: 'Техно' },
  { id: 'Trap', label: 'Трэп' },
  { id: 'Drum & Bass', label: 'Drum & Bass' },
  { id: 'R&B/Soul', label: 'R&B / Соул' },
  { id: 'Classical', label: 'Классика' },
  { id: 'Metal', label: 'Метал' },
  { id: 'Folk', label: 'Фолк' },
];

export type TrendingTime = 'week' | 'month' | 'year' | 'allTime';

export const TIMES: { id: TrendingTime; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
  { id: 'allTime', label: 'Всё время' },
];

interface RawTrack {
  id?: string;
  title?: string;
  duration?: number;
  genre?: string;
  permalink?: string;
  is_streamable?: boolean;
  is_stream_gated?: boolean;
  is_delete?: boolean;
  is_unlisted?: boolean;
  artwork?: Record<string, string> | null;
  user?: { name?: string } | null;
}

function toTrack(t: RawTrack): Track | null {
  if (!t.id || !t.title) return null;
  if (!t.is_streamable || t.is_stream_gated || t.is_delete || t.is_unlisted) return null;
  const art = t.artwork;
  return {
    key: `audius:${t.id}`,
    source: 'audius',
    title: t.title,
    artist: t.user?.name || 'Неизвестный исполнитель',
    artwork: art?.['480x480'] ?? art?.['150x150'] ?? art?.['1000x1000'],
    duration: t.duration,
    url: `${BASE}/tracks/${encodeURIComponent(t.id)}/stream?app_name=${APP}`,
    link: t.permalink ? `https://audius.co${t.permalink}` : undefined,
    genre: t.genre,
  };
}

async function get(
  path: string,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<RawTrack[]> {
  const qs = new URLSearchParams({ app_name: APP });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const res = await fetch(`${BASE}${path}?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`Audius ${res.status}`);
  const json = (await res.json()) as { data?: RawTrack[] };
  return json.data ?? [];
}

function toPage(raw: RawTrack[], offset: number, limit: number): Page {
  const items = raw.map(toTrack).filter((t): t is Track => t !== null);
  return { items, more: raw.length >= limit, next: offset + raw.length };
}

export async function trending(
  opts: { genre?: string; time?: TrendingTime; limit?: number; offset?: number },
  signal?: AbortSignal,
): Promise<Page> {
  const limit = opts.limit ?? 30;
  const offset = opts.offset ?? 0;
  const raw = await get(
    '/tracks/trending',
    { genre: opts.genre, time: opts.time ?? 'week', limit, offset },
    signal,
  );
  return toPage(raw, offset, limit);
}

export async function search(
  query: string,
  opts: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<Page> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const raw = await get('/tracks/search', { query, limit, offset }, signal);
  return toPage(raw, offset, limit);
}
