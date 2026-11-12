import { useCallback, useState } from 'react';

export type RefreshState = {
  /** True while a pull-to-refresh is running; the spinner shows. */
  refreshing: boolean;
  onRefresh: () => void;
};

/**
 * Pull-to-refresh for a list screen. Give it the same load function the screen
 * already uses, and pass the result to `<Screen refresh={...}>`.
 *
 * `load` should handle its own errors (set the screen's error text), so a failed
 * refresh shows the same message as a failed first load. If it still throws,
 * the spinner stops anyway.
 */
export function useRefresh(load: () => Promise<unknown>): RefreshState {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load()
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [load]);

  return { refreshing, onRefresh };
}
