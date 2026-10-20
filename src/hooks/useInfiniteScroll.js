import { useEffect, useRef } from 'react';

export default function useInfiniteScroll({ rootRef, hasMore, loading, onLoadMore }) {
  const sentinelRef = useRef(null);
  const loadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const root = rootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore || loading) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current();
      },
      { root, rootMargin: '0px 0px 180px', threshold: 0.01 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, rootRef]);

  return sentinelRef;
}
