import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Backend } from '../api/backend';
import Shell from '../components/layout/Shell';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import UserBadge from '../components/UserBadge';
import AeButton from '../components/AeButton';
import { relativeTime } from '../utils/time';
import { deeplinkPost } from '../auth/deeplink';

import { useWallet, useModal } from '../../hooks';
// Legacy page kept for compatibility, redirect to unified PostDetail route
export default function TipDetail() {
  const { tipId } = useParams();
  const navigate = useNavigate();
  const [tip, setTip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [openReplyFor, setOpenReplyFor] = useState<string | number | null>(null);
    const address = useWallet().address as string | null;
  const useSdkWallet = true; // TODO: Replace with useAeternity hook
  useEffect(() => {
    if (!tipId) return;
    // Redirect to unified path
    navigate(`/post/${tipId}`, { replace: true });
  }, [navigate, tipId]);
  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.5rem 1rem' }}>
        <div style={{ marginBottom: 8 }}>
          <AeButton onClick={() => navigate(-1)}>&larr;</AeButton>
        </div>
        {loading && <div>Loading…</div>}
        {error && <div>Error loading post.</div>}
        {tip && (
          <article style={{ display: 'grid', gap: 12 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div>{tip.address && <UserBadge address={tip.address} />}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tip.timestamp && <div style={{ color: '#9aa0a6', fontSize: 12 }}>{new Date(tip.timestamp).toLocaleString()}</div>}
                <AeButton onClick={() => openModal({ name: 'feed-item-menu', props: { tipId, url: tip.url, author: tip.address } })}>•••</AeButton>
              </div>
            </header>
            <h2 style={{ margin: 0, fontSize: 18 }}>{tip.title}</h2>
            {tip.url && (
              <a href={tip.url} target="_blank" rel="noreferrer" style={{ color: '#7aa2ff' }}>{tip.url}</a>
            )}
            {tip.linkPreview && (tip.linkPreview.title || tip.linkPreview.description) && (
              <a href={tip.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#c3c3c7' }}>
                <div style={{ background: '#2a2a36', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
                  {tip.linkPreview.image && (
                    <img src={Backend.getTipPreviewUrl(tip.linkPreview.image)} alt="preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                  <div style={{ fontWeight: 700, color: '#fff' }}>{tip.linkPreview.title}</div>
                  <div style={{ fontSize: 13 }}>{tip.linkPreview.description}</div>
                </div>
              </a>
            )}
            {Array.isArray(tip.media) && tip.media.length > 0 && (
              <div>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                  {tip.media.map((m: string) => (
                    <img key={m} src={m} alt="media" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} />
                  ))}
                </div>
              </div>
            )}
            <section style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16, margin: '12px 0' }}>Comments</h3>
              {comments.length === 0 ? (
                <div style={{ color: '#c3c3c7' }}>No comments yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {comments
                    .filter((c) => !c.parentId)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((c) => {
                      const author = c.address || c.author || c.sender;
                      const children = comments
                        .filter((x) => x.parentId === c.id)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                      return (
                        <div key={c.id} style={{ background: '#242430', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            {author && <UserBadge address={author} />}
                            <span style={{ color: '#c3c3c7', fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{c.text}</div>
                          <div>
                            <AeButton onClick={() => setOpenReplyFor(openReplyFor === c.id ? null : c.id)}>Reply</AeButton>
                          </div>
                          {openReplyFor === c.id && (
                            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                              <textarea
                                placeholder="Write a reply"
                                rows={3}
                                style={{ resize: 'vertical', background: '#1c1c24', color: '#fff', border: '1px solid #2f2f3b', borderRadius: 6, padding: 8 }}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                              />
                              <AeButton
                                onClick={async () => {
                                  const text = newComment.trim();
                                  if (!text || !tipId) return;
                                  try {
                                    if (useSdkWallet && address) {
                                      await (dispatch as any)(callWithAuth({ method: 'sendTipComment' as any, arg: { tipId, text, author: address, parentId: c.id } }));
                                    } else {
                                      deeplinkPost({ postId: tipId, text, parentId: c.id } as any);
                                      return;
                                    }
                                    setNewComment(''); setOpenReplyFor(null);
                                     const list = await Backend.getPostChildren(tipId);
                                    setComments(Array.isArray(list) ? list : []);
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                disabled={!newComment.trim()}
                              >Reply</AeButton>
                            </div>
                          )}
                          {children.length > 0 && (
                            <div style={{ marginTop: 8, paddingLeft: 24, display: 'grid', gap: 8 }}>
                              {children.map((cc: any) => {
                                const ca = cc.address || cc.author || cc.sender;
                                return (
                                  <div key={cc.id} style={{ background: '#2a2a36', borderRadius: 8, padding: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                      {ca && <UserBadge address={ca} />}
                                      <span style={{ color: '#c3c3c7', fontSize: 12 }}>{new Date(cc.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{cc.text}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                <textarea
                  placeholder="Add a comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', background: '#1c1c24', color: '#fff', border: '1px solid #2f2f3b', borderRadius: 6, padding: 8 }}
                />
                <AeButton
                  onClick={async () => {
                    const text = newComment.trim();
                    if (!text || !tipId) return;
                    try {
                      if (useSdkWallet && address) {
                        await (dispatch as any)(callWithAuth({ method: 'sendTipComment' as any, arg: { tipId, text, author: address } }));
                      } else {
                        deeplinkPost({ postId: tipId, text } as any);
                        return;
                      }
                      setNewComment('');
                      const list = await Backend.getPostChildren(tipId);
                      setComments(Array.isArray(list) ? list : []);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  disabled={!newComment.trim()}
                >Reply</AeButton>
              </div>
            </section>
          </article>
        )}
      </div>
    </Shell>
  );
}

 