import { useEffect, useId, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { request } from './api';

export const ShortsCommentButton = ({
  id, active, onClick,
}: { id: string; active: boolean; onClick: () => void }) => {
  const descriptionId = useId();
  const [result, setResult] = useState<{ id: string; count: bigint }>();
  const count = result?.id === id ? result.count : undefined;
  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    request<{ comments: string }>(`/${encodeURIComponent(id)}/stats`, undefined, undefined, {
      signal: controller.signal, timeout: 20000,
    }).then((stats) => {
      if (!controller.signal.aborted && typeof stats.comments === 'string' && /^(0|[1-9]\d{0,77})$/.test(stats.comments)) {
        setResult({ id, count: BigInt(stats.comments) });
      }
    }).catch(() => { /* Keep the last known count when offline; never substitute a false zero. */ });
    return () => controller.abort();
  }, [id, active]);
  const description = count === undefined ? 'Comment count unavailable' : `${count.toLocaleString()} ${count === 1n ? 'comment' : 'comments'}`;
  return (
    <div className="sv-action">
      <button type="button" className="sv-action-button" aria-label="Video comments" aria-describedby={descriptionId} title="Comments" onClick={onClick}>
        <MessageCircle size={23} aria-hidden="true" />
      </button>
      <strong id={descriptionId} className="sv-comment-count" aria-label={description} title={description}>
        {count === undefined ? '—' : new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(count)}
      </strong>
    </div>
  );
};
