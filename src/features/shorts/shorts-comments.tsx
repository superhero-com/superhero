import {
  useEffect, useMemo, useRef, useState, type CSSProperties,
} from 'react';
import {
  ArrowDownWideNarrow, ChevronDown, LockKeyhole, MessageCircle, Send, X,
} from 'lucide-react';
import { request, ShortsApiError } from './api';
import { ShortsDialog } from './shorts-dialog';
import { ShortsCreator } from './shorts-creator';
import { ShortsCommentTime } from './shorts-comment-time';
import {
  loadCommentPage, matchesPublishedComment, mergeComments, type CommentPage, type PublishedComment,
} from './shorts-comment-page';
import type { ShortsContractPolicy } from './shorts-contract-policy';
import './shorts-comments.css';

const CommentBody = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || expanded) return undefined;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);
  return (
    <>
      <p ref={ref} dir="auto" className={`sh-comment-text${expanded ? '' : ' is-collapsed'}`}>{text}</p>
      {(overflows || expanded) && (
        <button type="button" className="sh-comment-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </>
  );
};

export const ShortsComments = ({
  id, title, creator, actor, policy, busy, walletPending,
  revision, publishedComment, message, onClose, onConnect, onAdd,
}: {
  id: string; title: string; creator?: string; actor: string; policy: ShortsContractPolicy;
  busy: boolean; walletPending: boolean; revision: number;
  publishedComment?: PublishedComment; message: string;
  onClose: () => void; onConnect: () => unknown;
  onAdd: (text: string) => Promise<boolean>;
}) => {
  const [page, setPage] = useState<CommentPage>();
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [viewport, setViewport] = useState<{ height: number; top: number }>();
  const pending = useRef<AbortController | undefined>(undefined);
  const generation = useRef(0);
  const submission = useRef(false);
  const draftScope = useRef('');
  draftScope.current = `${id}:${actor}`;
  const list = useRef<HTMLDivElement>(null);
  const posted = useRef<HTMLLIElement>(null);
  const [highlighted, setHighlighted] = useState<string>();
  const target = useRef<PublishedComment | undefined>(undefined);
  const lastPublished = useRef(publishedComment);
  const lookupAttempts = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const working = busy || submitting;
  useEffect(() => {
    const visible = window.visualViewport;
    if (!visible) return undefined;
    const update = () => setViewport({ height: visible.height, top: visible.offsetTop });
    update();
    visible.addEventListener('resize', update);
    visible.addEventListener('scroll', update);
    return () => {
      visible.removeEventListener('resize', update);
      visible.removeEventListener('scroll', update);
    };
  }, []);
  useEffect(() => {
    setText(''); setExpanded(false); setSubmitError('');
    target.current = undefined; setHighlighted(undefined);
  }, [id, actor]);
  useEffect(() => {
    if (publishedComment === lastPublished.current) return;
    lastPublished.current = publishedComment;
    if (!publishedComment || publishedComment.videoId !== id || publishedComment.author !== actor) return;
    target.current = publishedComment; lookupAttempts.current = 0;
    setText(''); setExpanded(false); setSubmitError('');
    setReload((value) => value + 1);
  }, [publishedComment, id, actor]);
  useEffect(() => {
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout>;
    generation.current += 1;
    const { current } = generation;
    pending.current?.abort(); pending.current = controller;
    setLoading(true); setError(''); setPage(undefined);
    loadCommentPage(id, AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]), target.current)
      .then((result) => {
        if (generation.current !== current || controller.signal.aborted) return;
        setPage(result);
        if (!target.current) return;
        const match = result.items.find((item) => matchesPublishedComment(item, target.current!));
        if (match) { setHighlighted(match.id); target.current = undefined; } else if (lookupAttempts.current < 5) {
          lookupAttempts.current += 1;
          retry = setTimeout(() => setReload((value) => value + 1), 2000);
        } else setError('Your comment is published. Reload comments to find it.');
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ShortsApiError && reason.status === 409 && lookupAttempts.current < 5) {
          lookupAttempts.current += 1;
          retry = setTimeout(() => setReload((value) => value + 1), 1000);
        } else setError(reason instanceof Error ? reason.message : 'Comments are unavailable.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { clearTimeout(retry); controller.abort(); pending.current?.abort(); };
  }, [id, actor, revision, reload]);
  useEffect(() => { if (list.current) list.current.scrollTop = 0; }, [id, sort, revision, reload]);
  useEffect(() => {
    if (!highlighted || !posted.current || !list.current) return;
    const container = list.current;
    container.scrollTo({
      top: container.scrollTop + posted.current.getBoundingClientRect().top - container.getBoundingClientRect().top - 12,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    posted.current.focus({ preventScroll: true });
  }, [highlighted]);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = 'auto';
    input.current.style.height = `${Math.min(input.current.scrollHeight + 2, 144)}px`;
    input.current.style.overflowY = input.current.scrollHeight > 142 ? 'auto' : 'hidden';
  }, [text, expanded, actor]);
  const more = async () => {
    if (!page?.next || loading) return;
    const controller = new AbortController();
    pending.current?.abort(); pending.current = controller;
    const { current } = generation;
    setLoading(true); setError('');
    try {
      const next = await request<CommentPage>(`/${encodeURIComponent(id)}/comments?cursor=${encodeURIComponent(page.next)}&version=${encodeURIComponent(page.version)}`, undefined, undefined, { signal: controller.signal, timeout: 20000 });
      if (generation.current === current && !controller.signal.aborted) {
        setPage({ ...next, items: mergeComments(page.items, next.items) });
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ShortsApiError && reason.status === 409) {
        setReload((value) => value + 1);
      } else setError(reason instanceof Error ? reason.message : 'Comments are unavailable.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const comments = useMemo(() => [...(page?.items || [])].sort((a, b) => {
    const delta = BigInt(a.height) - BigInt(b.height) || BigInt(a.id) - BigInt(b.id);
    const order = delta < 0n ? -1 : Number(delta > 0n);
    return sort === 'newest' ? -order : order;
  }), [page, sort]);
  const chars = [...text].length;
  const bytes = new TextEncoder().encode(text).length;
  const tooLong = chars > policy.maxCommentChars || bytes > policy.maxCommentBytes;
  const valid = text.trim().length > 0 && !tooLong;
  const composing = expanded || !!text || working;
  const submit = async () => {
    if (!valid || working || submission.current || !policy.commentsEnabled) return;
    const scope = draftScope.current;
    submission.current = true; setSubmitting(true); setSubmitError('');
    try {
      if (await onAdd(text) && scope === draftScope.current) { setText(''); setExpanded(false); }
    } catch {
      if (scope === draftScope.current) setSubmitError('Your comment was not published. Your draft is saved here; try again.');
    } finally { submission.current = false; setSubmitting(false); }
  };
  return (
    <ShortsDialog
      label="Video comments"
      className="sh-comments-dialog"
      busy={working}
      suspended={walletPending}
      onClose={onClose}
      style={viewport ? {
        '--sh-comments-viewport-height': `${viewport.height}px`,
        '--sh-comments-viewport-top': `${viewport.top}px`,
      } as CSSProperties : undefined}
    >
      <section className="sh-comments">
        <header className="sh-comments-header">
          <div className="sh-comments-heading">
            <h2>
              Comments
              {' '}
              {page && <span className="sh-comments-count">{BigInt(page.total).toLocaleString()}</span>}
            </h2>
            <button type="button" className="sh-comments-close" aria-label="Close comments" disabled={working} onClick={onClose}><X size={20} aria-hidden="true" /></button>
          </div>
          <p className="sh-comments-title" dir="auto">{title}</p>
          <div className="sh-comments-toolbar">
            <span>{page?.next ? `${page.items.length.toLocaleString()} of ${BigInt(page.total).toLocaleString()} loaded` : 'Join the conversation'}</span>
            <label className="sh-comments-sort" htmlFor="short-comment-sort">
              <ArrowDownWideNarrow size={16} aria-hidden="true" />
              <select id="short-comment-sort" aria-label={page?.next ? 'Sort loaded comments' : 'Sort comments'} value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="newest">{page?.next ? 'Newest loaded' : 'Newest first'}</option>
                <option value="oldest">{page?.next ? 'Oldest loaded' : 'Oldest first'}</option>
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
          </div>
        </header>
        {/* The named region lets keyboard users scroll without tabbing through every author. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div ref={list} className="sh-comments-list" role="region" aria-label="Comments" aria-busy={loading} tabIndex={0}>
          {comments.length > 0 && (
            <ol className="sh-comment-items">
              {comments.map((comment) => (
                <li key={comment.id} ref={comment.id === highlighted ? posted : undefined} tabIndex={-1} className={comment.id === highlighted ? 'is-new-comment' : undefined}>
                  <article className="sh-comment">
                    <ShortsCreator address={comment.author} compact><ShortsCommentTime height={comment.height} /></ShortsCreator>
                    {(comment.author === creator || comment.author === actor) && (
                      <div className="sh-comment-badges">
                        {comment.author === creator && <span>Creator</span>}
                        {comment.author === actor && <span>You</span>}
                      </div>
                    )}
                    <div className="sh-comment-body"><CommentBody text={comment.text} /></div>
                  </article>
                </li>
              ))}
            </ol>
          )}
          {page && !page.items.length && !loading && (
            <div className="sh-comments-empty">
              <span className="sh-comments-empty-icon"><MessageCircle size={28} aria-hidden="true" /></span>
              <h3>No comments yet.</h3>
              <p>What stood out to you? Be the first to share a thought.</p>
            </div>
          )}
          {loading && !page && (
          <div className="sh-comments-skeleton" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <div key={key}>
                <i />
                <span />
                <span />
              </div>
            ))}
          </div>
          )}
          {loading && <p className="sh-comments-loading" role="status">Loading comments…</p>}
          {error && (
            <div className="sh-comments-error" role="alert">
              <strong>
                {`Couldn’t load ${page ? 'more comments' : 'comments'}`}
              </strong>
              <p>{error}</p>
              <button type="button" disabled={loading} onClick={() => (page?.next && !target.current ? more() : setReload((value) => value + 1))}>Retry</button>
            </div>
          )}
          {page?.next && !error && (
          <button type="button" className="sh-comments-more" disabled={loading} onClick={more}>
            {loading ? 'Loading…' : 'More comments'}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          )}
        </div>
        <footer className="sh-comments-footer">
          {actor ? (
            <form className={`sh-comment-form${composing ? ' is-expanded' : ''}`} onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <label htmlFor="short-comment-text">
                <span className="sh-comment-label">Add a comment</span>
                <textarea
                  ref={input}
                  id="short-comment-text"
                  placeholder="Share your thoughts…"
                  value={text}
                  dir="auto"
                  onFocus={() => setExpanded(true)}
                  onChange={(event) => { setText(event.target.value); setSubmitError(''); }}
                  disabled={working || !policy.commentsEnabled}
                  aria-invalid={tooLong || undefined}
                  aria-describedby={`short-comment-notice${composing ? ' short-comment-limit' : ''}`}
                  rows={1}
                />
              </label>
              {composing && (
                <div className="sh-comment-composer-details">
                  <div id="short-comment-limit" className={`sh-comment-limit${tooLong ? ' is-invalid' : ''}`} aria-live="polite">
                    <span>
                      {chars}
                      /
                      {policy.maxCommentChars}
                      {' '}
                      characters
                    </span>
                    {tooLong && <span>{chars > policy.maxCommentChars ? 'Your comment is too long.' : 'Some characters use more space. Shorten your comment.'}</span>}
                  </div>
                  <div className="sh-comment-form-actions">
                    <button type="button" className="sh-comment-cancel" disabled={working} onClick={() => { setText(''); setExpanded(false); setSubmitError(''); }}>Cancel</button>
                    <button type="submit" className="primary sh-comment-submit" disabled={working || !valid || !policy.commentsEnabled}>
                      <Send size={15} aria-hidden="true" />
                      {working ? 'Publishing…' : 'Publish with wallet'}
                    </button>
                  </div>
                </div>
              )}
              <p id="short-comment-notice" className="sh-comment-notice">
                <LockKeyhole size={13} aria-hidden="true" />
                <span>
                  {composing
                    ? 'Comments are public and permanent. They can’t be edited or deleted. Your wallet shows the network fee.'
                    : 'Comments are public and permanent.'}
                </span>
              </p>
              {!policy.commentsEnabled && <p className="sh-comment-paused" role="status">Comments are currently paused.</p>}
            </form>
          ) : (
            <div className="sh-comments-connect">
              <div>
                <MessageCircle size={20} aria-hidden="true" />
                <span>
                  <strong>Add your voice</strong>
                  <small>Connect your wallet to join the conversation.</small>
                </span>
              </div>
              <button type="button" className="primary" disabled={busy} onClick={onConnect}>Connect wallet to comment</button>
            </div>
          )}
          {submitError && <p className="sh-comment-submit-error" role="alert">{submitError}</p>}
          {message && <p className="sh-comment-status" role="status">{message}</p>}
        </footer>
      </section>
    </ShortsDialog>
  );
};
