import type { Track } from './types';

/** "3:07" / "1:02:30"; empty string when the duration is unknown. */
export function fmtTime(sec?: number | null): string {
  if (sec == null || !isFinite(sec) || sec < 0) return '';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** Like fmtTime, but "0:00" instead of an empty string. */
export function fmtClock(sec?: number | null): string {
  return fmtTime(sec) || '0:00';
}

export function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е');
}

export function filterTracks(tracks: Track[], query: string): Track[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return tracks;
  return tracks.filter((t) => {
    const hay = normalize(`${t.title} ${t.artist} ${t.album ?? ''} ${t.folder ?? ''}`);
    return tokens.every((tok) => hay.includes(tok));
  });
}

export function pluralRu(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const countTracks = (n: number) => `${n} ${pluralRu(n, ['трек', 'трека', 'треков'])}`;

export function shuffled<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)));
}

const NOISE =
  /\s*[([{][^)\]}]*(official|lyric|audio|video|clip|4k|hd|hq|mv|visuali[sz]er|премьера|клип|текст|слова|скачать)[^)\]}]*[)\]}]/gi;

/**
 * Downloaded files rarely carry usable tags in the media store, so the name is the
 * best source: "01 - Artist - Title (Official Video).mp3" → Artist / Title.
 */
export function parseFilename(filename: string): { artist: string; title: string } {
  let base = filename.replace(/\.[A-Za-z0-9]{2,5}$/, '').replace(/_+/g, ' ');
  base = base.replace(NOISE, '').replace(/\s{2,}/g, ' ').trim();
  base = base.replace(/^\d{1,3}\s*[-._)]\s*/, '');
  const m = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return { artist: '', title: base || filename };
}
