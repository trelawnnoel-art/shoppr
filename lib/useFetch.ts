'use client';

import { useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/** Minimal client-side fetch hook — this app is small enough that a full
 * data-fetching library (SWR/React Query) would be more machinery than the
 * problem needs. Re-fetches whenever `url` changes; ignores results from a
 * request that's been superseded by a newer one (the `cancelled` flag). */
export function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, isLoading: true, error: null });

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: T) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Something went wrong',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
