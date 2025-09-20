import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Backend } from '../api/backend';
import Shell from '../components/layout/Shell';
import RightRail from '../components/layout/RightRail';
import LeftNav from '../components/layout/LeftNav';
import UserBadge from '../components/UserBadge';
import AeButton from '../components/AeButton';
import { relativeTime } from '../utils/time';
import { deeplinkPost } from '../auth/deeplink';

import { useWallet, useModal } from '../hooks';
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
    <Shell left={<LeftNav />} right={<RightRail />}>
      <div className="max-w-[880px] mx-auto px-4 py-2">
        <div className="mb-2">
          <AeButton onClick={() => navigate(-1)}>&larr;</AeButton>
        </div>
        {loading && <div className="text-white/80">Loading…</div>}
        {error && <div className="text-red-400">Error loading post.</div>}
        {tip && (
          <article className="grid gap-3">
            <header className="flex items-center gap-3 justify-between">
              <div>{tip.address && <UserBadge address={tip.address} />}</div>
              <div className="flex items-center gap-2">
                {tip.timestamp && <div className="text-white/60 text-xs">{new Date(tip.timestamp).toLocaleString()}</div>}
                <AeButton onClick={() => openModal({ name: 'feed-item-menu', props: { tipId, url: tip.url, author: tip.address } })}>•••</AeButton>
              </div>
            </header>
            <h2 className="m-0 text-lg text-white font-semibold">{tip.title}</h2>
            {tip.url && (
              <a href={tip.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">{tip.url}</a>
            )}
            {tip.linkPreview && (tip.linkPreview.title || tip.linkPreview.description) && (
              <a href={tip.url} target="_blank" rel="noreferrer" className="no-underline text-white/80 hover:text-white">
                <div className="bg-gray-800 rounded-lg p-3 grid gap-2">
                  {tip.linkPreview.image && (
                    <img src={Backend.getTipPreviewUrl(tip.linkPreview.image)} alt="preview" className="w-full max-h-60 object-cover rounded-md" />
                  )}
                  <div className="font-bold text-white">{tip.linkPreview.title}</div>
                  <div className="text-sm text-white/80">{tip.linkPreview.description}</div>
                </div>
              </a>
            )}
            {Array.isArray(tip.media) && tip.media.length > 0 && (
              <div>
                <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
                  {tip.media.map((m: string) => (
                    <img key={m} src={m} alt="media" className="w-full h-40 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
            <section className="mt-4">
              <h3 className="text-base font-semibold text-white my-3">Comments</h3>
              {comments.length === 0 ? (
                <div className="text-white/70">No comments yet.</div>
              ) : (
                <div className="grid gap-2">
                  {comments
                    .filter((c) => !c.parentId)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((c) => {
                      const author = c.address || c.author || c.sender;
                      const children = comments
                        .filter((x) => x.parentId === c.id)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                      return (
                        <div key={c.id} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            {author && <UserBadge address={author} />}
                            <span className="text-white/70 text-xs">{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="whitespace-pre-wrap mb-2 text-white">{c.text}</div>
                          <div>
                            <AeButton onClick={() => setOpenReplyFor(openReplyFor === c.id ? null : c.id)}>Reply</AeButton>
                          </div>
                          {openReplyFor === c.id && (
                            <div className="grid gap-2 mt-2">
                              <textarea
                                placeholder="Write a reply"
                                rows={3}
                                className="resize-y bg-gray-900 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:border-purple-400"
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
                            <div className="mt-2 pl-6 grid gap-2">
                              {children.map((cc: any) => {
                                const ca = cc.address || cc.author || cc.sender;
                                return (
                                  <div key={cc.id} className="bg-gray-700 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      {ca && <UserBadge address={ca} />}
                                      <span className="text-white/70 text-xs">{new Date(cc.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="whitespace-pre-wrap text-white">{cc.text}</div>
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
              <div className="grid gap-2 mt-3">
                <textarea
                  placeholder="Add a comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="resize-y bg-gray-900 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:border-purple-400"
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

 