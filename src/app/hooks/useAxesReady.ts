import { RefObject, useEffect, useState } from 'react';

interface Options {
  timeout?: number;
  pollInterval?: number;
}

export default function useAxesReady(containerRef: RefObject<HTMLElement | null>, deps: any[] = [], options: Options = {}) {
  const { timeout = 2000, pollInterval = 50, } = options;
  const [axesReady, setAxesReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Only consider axes ready when there is at least one rendered tick
    const hasTicks = (rootEl: HTMLElement) => !!rootEl.querySelector('.recharts-cartesian-axis .recharts-cartesian-axis-tick');

    // Quick check
    if (hasTicks(el)) {
      // small delay to ensure internal scales are populated
      const t = setTimeout(() => setAxesReady(true), 50);
      return () => clearTimeout(t);
    }

    let timedOut = false;
    const to = setTimeout(() => {
      timedOut = true;
    }, timeout);

    const observer = new MutationObserver(() => {
      if (timedOut) return;
      if (hasTicks(el)) {
        // Wait one RAF + short timeout to let Recharts finalize scales
        requestAnimationFrame(() => {
          const t = setTimeout(() => setAxesReady(true), 50);
          clearTimeout(to);
          observer.disconnect();
          return () => clearTimeout(t);
        });
      }
    });

    observer.observe(el, { childList: true, subtree: true });

    // Fallback polling in case mutations don't fire as expected
    const poll = setInterval(() => {
      if (timedOut) return;
      if (hasTicks(el)) {
        requestAnimationFrame(() => {
          const t = setTimeout(() => setAxesReady(true), 50);
          clearTimeout(to);
          observer.disconnect();
          clearInterval(poll);
          return () => clearTimeout(t);
        });
      }
    }, pollInterval);

    return () => {
      observer.disconnect();
      clearInterval(poll);
      clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...deps]);

  return axesReady;
}
