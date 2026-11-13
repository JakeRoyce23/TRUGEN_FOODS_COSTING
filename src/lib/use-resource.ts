import { useEffect, useState } from "react";

/** Discard stale requests when navigating, searching, or changing users. */
export function useResource<T>(key: string, load: () => Promise<T>) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; retry: number; data?: T; error?: string }>();
  useEffect(() => {
    let active = true;
    void load().then((data) => { if (active) setState({ key, retry, data }); })
      .catch((error: unknown) => { if (active) setState({ key, retry, error: error instanceof Error ? error.message : "Could not load records. Please try again." }); });
    return () => { active = false; };
  }, [key, retry, load]);
  const current = state?.key === key && state.retry === retry ? state : undefined;
  return { data: current?.data, error: current?.error, loading: !current, reload: () => setRetry((n) => n + 1) };
}
