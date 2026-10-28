import { useEffect, useRef, useState } from 'react';
import { request, ShortsApiError } from './api';
import { ShortsDialog } from './shorts-dialog';
import type { ShortsContractPolicy } from './shorts-contract-policy';
import './shorts-comments.css';

type Comment = { id: string; author: string; text: string; height: string };
type Page = { items: Comment[]; version: string; next: string | null; total: string };

export const ShortsComments = ({
  id, title, actor, policy, busy, walletPending, revision, publishedRevision, message, onClose, onConnect, onAdd,
}: {
  id: string; title: string; actor: string; policy: ShortsContractPolicy;
  busy: boolean; walletPending: boolean; revision: number; publishedRevision: number; message: string;
  onClose: () => void; onConnect: () => unknown;
  onAdd: (text: string) => Promise<boolean>;
}) => {
  const [page, setPage] = useState<Page>();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const pending = useRef<AbortController | undefined>(undefined);
  const generation = useRef(0);
  useEffect(() => { setText(''); }, [id, actor, publishedRevision]);
  useEffect(() => {
    const controller = new AbortController();
    generation.current += 1;
    const { current } = generation;
    pending.current?.abort(); pending.current = controller;
    setLoading(true); setError(''); setPage(undefined);
    request<Page>(`/${encodeURIComponent(id)}/comments`, undefined, undefined, { signal: controller.signal, timeout: 20000 })
      .then((result) => { if (generation.current === current && !controller.signal.aborted) setPage(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Comments are unavailable.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); pending.current?.abort(); };
  }, [id, revision, reload]);
  const more = async () => {
    if (!page?.next || loading) return;
    const controller = new AbortController();
    pending.current?.abort(); pending.current = controller;
    const { current } = generation;
    setLoading(true); setError('');
    try {
      const next = await request<Page>(`/${encodeURIComponent(id)}/comments?cursor=${page.next}&version=${page.version}`, undefined, undefined, { signal: controller.signal, timeout: 20000 });
      if (generation.current === current && !controller.signal.aborted) setPage({ ...next, items: [...page.items, ...next.items] });
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ShortsApiError && reason.status === 409) setReload((value) => value + 1);
      else setError(reason instanceof Error ? reason.message : 'Comments are unavailable.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const chars = [...text].length;
  const bytes = new TextEncoder().encode(text).length;
  const valid = chars > 0 && chars <= policy.maxCommentChars && bytes <= policy.maxCommentBytes;
  return (
    <ShortsDialog label="Video comments" busy={busy} suspended={walletPending} onClose={onClose}>
      <section className="sh-modal sh-comments">
        <div className="sh-comments-heading">
          <h2>
            Comments
            {page ? ` (${page.total})` : ''}
          </h2>
          <button type="button" disabled={busy} onClick={onClose}>Close</button>
        </div>
        <p>{title}</p>
        <div className="sh-comments-list" aria-live="polite">
          {page?.items.map((comment) => (
            <article key={comment.id}>
              <code className="sh-address">{comment.author}</code>
              <p className="sh-comment-text">{comment.text}</p>
            </article>
          ))}
          {page && !page.items.length && <p>No comments yet.</p>}
          {loading && <p role="status">Loading comments…</p>}
          {error && (
          <p role="alert">
            {error}
            <button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)}>Retry</button>
          </p>
          )}
          {page?.next && <button type="button" disabled={loading} onClick={more}>More comments</button>}
        </div>
        {actor ? (
          <form onSubmit={async (event) => { event.preventDefault(); if (valid && !busy && await onAdd(text)) setText(''); }}>
            <label htmlFor="short-comment-text">Add a comment</label>
            <textarea id="short-comment-text" value={text} onChange={(event) => setText(event.target.value)} disabled={busy || !policy.commentsEnabled} aria-describedby="short-comment-limit" rows={3} />
            <small id="short-comment-limit">{`${chars}/${policy.maxCommentChars} characters · ${bytes}/${policy.maxCommentBytes} bytes`}</small>
            <p>Comments are permanent public blockchain records and cannot be edited or deleted. Your wallet shows the network fee.</p>
            {!policy.commentsEnabled && <p>Comments are currently paused.</p>}
            <button type="submit" className="primary" disabled={busy || !valid || !policy.commentsEnabled}>Publish with wallet</button>
          </form>
        ) : <button type="button" onClick={onConnect}>Connect wallet to comment</button>}
        {message && <p role="status">{message}</p>}
      </section>
    </ShortsDialog>
  );
};
