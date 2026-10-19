import type { Page, Track } from '../types';

/**
 * iTunes Search API: free, no key. Gives 30-second previews of mainstream songs,
 * which is all the catalogue owners make available without a subscription.
 */
interface RawSong {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
  primaryGenreName?: string;
}

export async function search(query: string, limit = 25, signal?: AbortSignal): Promise<Page> {
  const qs = new URLSearchParams({
    term: query,
    media: 'music',
    entity: 'song',
    limit: String(limit),
  });
  const res = await fetch(`https://itunes.apple.com/search?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const json = (await res.json()) as { results?: RawSong[] };
  const items: Track[] = [];
  for (const r of json.results ?? []) {
    if (!r.previewUrl || !r.trackId || !r.trackName) continue;
    items.push({
      key: `itunes:${r.trackId}`,
      source: 'itunes',
      title: r.trackName,
      artist: r.artistName || 'Неизвестный исполнитель',
      album: r.collectionName,
      artwork: r.artworkUrl100?.replace('100x100bb', '600x600bb'),
      duration: 30,
      url: r.previewUrl,
      preview: true,
      link: r.trackViewUrl,
      genre: r.primaryGenreName,
    });
  }
  return { items, more: false, next: 0 };
}
