import { useCallback, useEffect, useRef, useState } from 'react';
import type { Page, Track } from '../types';
import { dedupe } from '../util';

interface PagedState {
  items: Track[];
  loading: boolean;
  more: boolean;
  error: boolean;
}

type Loader = (offset: number, signal: AbortSignal) => Promise<Page>;

/**
 * Loads a paged list from a remote source; restarts whenever `deps` change and
 * cancels the request that is no longer needed.
 */
export function usePaged(load: Loader, deps: readonly unknown[]) {
  const [state, setState] = useState<PagedState>({ items: [], loading: true, more: false, error: false });
  const controller = useRef<AbortController | null>(null);
  const loader = useRef(load);
  loader.current = load;
  const itemsRef = useRef<Track[]>([]);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (reset: boolean) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    if (reset) {
      itemsRef.current = [];
      offsetRef.current = 0;
    }
    setState((s) => ({ ...s, items: reset ? [] : s.items, loading: true, error: false }));
    try {
      const page = await loader.current(offsetRef.current, c.signal);
      if (c.signal.aborted) return;
      offsetRef.current = page.next;
      itemsRef.current = dedupe([...itemsRef.current, ...page.items]);
      setState({ items: itemsRef.current, loading: false, more: page.more, error: false });
    } catch {
      if (c.signal.aborted) return;
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    void fetchPage(true);
    return () => controller.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(() => {
    if (!state.loading && state.more) void fetchPage(false);
  }, [state.loading, state.more, fetchPage]);

  const retry = useCallback(() => void fetchPage(true), [fetchPage]);

  return { ...state, loadMore, retry };
}
