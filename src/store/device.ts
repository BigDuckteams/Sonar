import { create } from 'zustand';
import { devicePermission, deviceSupported, scanDevice } from '../sources/device';
import type { DevicePermission } from '../sources/device';
import type { Track } from '../types';

export type DeviceStatus =
  | 'idle'
  | 'checking'
  | 'unsupported'
  | 'needs-permission'
  | 'denied'
  | 'blocked'
  | 'scanning'
  | 'ready'
  | 'error';

interface DeviceState {
  status: DeviceStatus;
  tracks: Track[];
  error?: string;
  /** Check the permission silently and scan if it is already granted. */
  init: () => Promise<void>;
  /** Ask the user for the permission, then scan. */
  request: () => Promise<void>;
  rescan: () => Promise<void>;
}

function statusFor(p: DevicePermission): DeviceStatus {
  switch (p) {
    case 'unsupported':
      return 'unsupported';
    case 'undetermined':
      return 'needs-permission';
    case 'denied':
      return 'denied';
    case 'blocked':
      return 'blocked';
    default:
      return 'scanning';
  }
}

export const useDevice = create<DeviceState>((set, get) => {
  const scan = async () => {
    set({ status: 'scanning', error: undefined });
    try {
      const tracks = await scanDevice();
      set({ tracks, status: 'ready' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  };

  const apply = async (ask: boolean) => {
    if (!deviceSupported) {
      set({ status: 'unsupported' });
      return;
    }
    set({ status: 'checking' });
    try {
      const p = await devicePermission(ask);
      const status = statusFor(p);
      if (status === 'scanning') await scan();
      else set({ status });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  };

  return {
    status: 'idle',
    tracks: [],
    init: () => (get().status === 'idle' ? apply(false) : Promise.resolve()),
    request: () => apply(true),
    rescan: () => apply(false),
  };
});
