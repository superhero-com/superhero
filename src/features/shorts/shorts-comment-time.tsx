import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { CONFIG } from '@/config';

/** Comments store a generation height. Resolve its real time, never estimate block duration. */
export const ShortsCommentTime = ({ height }: { height: string }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const { data: time } = useQuery({
    queryKey: ['shorts-comment-time', CONFIG.NODE_URL, height],
    enabled: /^\d+$/.test(height) && Number.isSafeInteger(Number(height)),
    queryFn: async ({ signal }) => {
      const response = await fetch(`${CONFIG.NODE_URL.replace(/\/$/, '')}/v3/key-blocks/height/${height}`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      });
      if (!response.ok) throw new Error('Comment time is unavailable.');
      const block = await response.json();
      if (block.height !== Number(height) || !Number.isSafeInteger(block.time) || block.time <= 0
        || !Number.isFinite(new Date(block.time).getTime())) throw new Error('Invalid comment block time.');
      return block.time as number;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
  if (!time) return null;
  const date = new Date(time);
  return <time className="sh-comment-time" dateTime={date.toISOString()} title={date.toLocaleString()}>{moment(time).fromNow()}</time>;
};
