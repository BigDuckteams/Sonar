import { Platform } from 'react-native';
import {
  Album,
  AssetField,
  MediaType,
  PermissionStatus,
  Query,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-media-library';
import type { Track } from '../types';
import { parseFilename } from '../util';

/** Audio files that already live on the phone (downloads, Music folder, messengers…). */
export const deviceSupported = Platform.OS === 'android';

export type DevicePermission = 'granted' | 'undetermined' | 'denied' | 'blocked' | 'unsupported';

export async function devicePermission(ask: boolean): Promise<DevicePermission> {
  if (!deviceSupported) return 'unsupported';
  const res = ask
    ? await requestPermissionsAsync(false, ['audio'])
    : await getPermissionsAsync(false, ['audio']);
  if (res.granted) return 'granted';
  if (res.status === PermissionStatus.UNDETERMINED) return 'undetermined';
  return res.canAskAgain ? 'denied' : 'blocked';
}

const SYSTEM_FOLDERS = new Set(['ringtones', 'notifications', 'alarms']);

async function folderIndex(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const albums = await Album.getAlbumsMetadata();
    let next = 0;
    const worker = async () => {
      while (next < albums.length) {
        const album = albums[next++];
        try {
          const found = await new Query()
            .eq(AssetField.MEDIA_TYPE, MediaType.AUDIO)
            .album(new Album(album.id))
            .exeForMetadata();
          for (const m of found) map.set(m.id, album.title);
        } catch {
          // an unreadable folder must not break the whole scan
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  } catch {
    // folders are a nicety; the track list still works without them
  }
  return map;
}

function asUri(id: string): string {
  return id.includes('://') ? id : `content://media/external/audio/media/${id}`;
}

export async function scanDevice(): Promise<Track[]> {
  const [metas, folders] = await Promise.all([
    new Query()
      .eq(AssetField.MEDIA_TYPE, MediaType.AUDIO)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
      .exeForMetadata(),
    folderIndex(),
  ]);

  const out: Track[] = [];
  for (const m of metas) {
    const folder = folders.get(m.id);
    if (folder && SYSTEM_FOLDERS.has(folder.toLowerCase())) continue;
    // The media store reports seconds; guard against a millisecond value slipping through.
    const raw = m.duration ?? undefined;
    const duration = raw !== undefined && raw > 36000 ? raw / 1000 : raw;
    if (duration !== undefined && duration > 0 && duration < 10) continue; // system sounds

    const { artist, title } = parseFilename(m.filename ?? 'Без названия');
    out.push({
      key: `device:${m.id}`,
      source: 'device',
      title,
      artist: artist || 'Неизвестный исполнитель',
      album: folder,
      folder,
      duration,
      url: asUri(m.id),
      addedAt: m.creationTime ?? undefined,
    });
  }
  return out;
}
