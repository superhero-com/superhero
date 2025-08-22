import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Backend } from '../api/backend';
import Shell from '../components/layout/Shell';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import UserBadge from '../components/UserBadge';
import AeButton from '../components/AeButton';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { callWithAuth } from '../store/slices/backendSlice';
import { relativeTime } from '../utils/time';
import { open } from '../store/slices/modalsSlice';
import { deeplinkPost } from '../auth/deeplink';
import Identicon from '../components/Identicon';
import './PostDetail.scss';

export default function PostDetail() {
  const { postId, id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [newReply, setNewReply] = useState('');
  const [openReplyFor, setOpenReplyFor] = useState<string | number | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const address = useSelector((s: RootState) => s.root.address) as string | null;
  const useSdkWallet = useSelector((s: RootState) => s.aeternity.useSdkWallet);
  const chainNames = useSelector((s: RootState) => s.root.chainNames) as any;

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    Backend.getPostById(postId).then((p) => { if (!cancelled) setPost(p); }).catch(() => {});
    Backend.getPostChildren(postId).then((list) => { if (!cancelled) setChildren(Array.isArray(list) ? list : []); }).catch(() => {});
    setLoading(false);
    return () => { cancelled = true; };
  }, [postId]);

  // Load selected comment when /comment/:id is present
  useEffect(() => {
    if (!id) { setSelectedComment(null); return; }
    let cancelled = false;
    Backend.getCommentById(id).then((c) => { if (!cancelled) setSelectedComment(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // Periodic refresh (120s)
  useEffect(() => {
    if (!postId) return;
    const interval = window.setInterval(async () => {
      try {
        const [p, list] = await Promise.all([
          Backend.getPostById(postId),
          Backend.getPostChildren(postId),
        ]);
        setPost(p);
        setChildren(Array.isArray(list) ? list : []);
        if (id) {
          try { setSelectedComment(await Backend.getCommentById(id)); } catch {}
        }
      } catch {}
    }, 120 * 1000);
    return () => window.clearInterval(interval);
  }, [postId, id]);

  // Compute list to render depending on focus (tip vs single comment)
  const topLevelReplies = useMemo(() => {
    if (!children) return [] as any[];
    if (id) return children.filter((c) => String(c.parentId) === String(id));
    return children.filter((c) => !c.parentId);
  }, [children, id]);

  // Dynamic meta tags similar to Vue metaInfo()
  useEffect(() => {
    const record = id ? selectedComment : post;
    if (!record) return;
    const title = id ? 'Comment' : `Tip ${String(postId).split('_')[0]}`;
    const description = id ? record.title || record.text : record.text;
    const author = id ? (record.sender || record.address || record.author) : record.author;
    const image = (record.media && record.media[0]) || (author ? Backend.getProfileImageUrl(author) : undefined);
    document.title = title;
    function setMeta(attr: 'name' | 'property', key: string, value: string) {
      if (!value) return;
      let el = document.querySelector(`meta[${attr}='${key}']`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', value);
    }
    const url = window.location.href.split('?')[0];
    if (image) setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:title', `Superhero ${title}`);
    if (description) setMeta('property', 'og:description', description);
    setMeta('property', 'og:site_name', 'Superhero');
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:site', '@superhero_chain');
    setMeta('name', 'twitter:creator', '@superhero_chain');
    setMeta('name', 'twitter:image:alt', 'Superhero post');
  }, [id, postId, post, selectedComment]);

  const getAuthorInfo = (item: any) => {
    const authorAddress = item.address || item.author || item.sender;
    const chainName = chainNames?.[authorAddress];
    return { authorAddress, chainName };
  };

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div className="post-detail-container">
        <div className="back-button-container">
          <AeButton onClick={() => navigate(-1)} variant="ghost" size="sm">
            ← Back
          </AeButton>
        </div>
        
        {loading && <div className="loading-state">Loading…</div>}
        {error && <div className="error-state">Error loading post.</div>}
        
        {(id ? selectedComment : post) && (
          <article className="post-detail">
            <header className="post-header">
              <div className="author-section">
                {(() => {
                  const { authorAddress, chainName } = getAuthorInfo(id ? selectedComment : post);
                  return authorAddress ? (
                    <div className="author-display">
                      <div className="avatar-container">
                        <div className="avatar-stack">
                          {/* Chain avatar (bigger) if available */}
                          {chainName && chainName !== 'Legend' && (
                            <div className="chain-avatar">
                              <Identicon address={authorAddress} size={56} name={chainName} />
                            </div>
                          )}
                          {/* Address avatar (smaller) if no chain name, or as overlay */}
                          {(!chainName || chainName === 'Legend') && (
                            <div className="address-avatar">
                              <Identicon address={authorAddress} size={56} />
                            </div>
                          )}
                          {/* Overlay avatar for chain names */}
                          {chainName && chainName !== 'Legend' && (
                            <div className="address-avatar-overlay">
                              <Identicon address={authorAddress} size={28} />
                            </div>
                          )}
                        </div>
                      </div>
                      <UserBadge 
                        address={authorAddress} 
                        showAvatar={false}
                        chainName={chainName}
                        linkTo="profile" 
                        shortAddress 
                      />
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="post-actions">
                {!id && post?.timestamp && (
                  <div className="timestamp">
                    {relativeTime(new Date(post.timestamp))}
                  </div>
                )}
                {!id && (
                  <AeButton 
                    variant="ghost" 
                    size="sm"
                    onClick={() => dispatch(open({ 
                      name: 'feed-item-menu', 
                      props: { postId, url: post.url, author: (post.author || post.address) } 
                    }))}
                  >
                    •••
                  </AeButton>
                )}
              </div>
            </header>
            
            {!id && <h2 className="post-title">{post.title}</h2>}
            {!id && post.url && (
              <a href={post.url} target="_blank" rel="noreferrer" className="post-url">
                {post.url}
              </a>
            )}
            {!id && post.linkPreview && (post.linkPreview.title || post.linkPreview.description) && (
              <a href={post.url} target="_blank" rel="noreferrer" className="link-preview">
                <div className="preview-content">
                  {post.linkPreview.image && (
                    <img 
                      src={Backend.getTipPreviewUrl(post.linkPreview.image)} 
                      alt="preview" 
                      className="preview-image" 
                    />
                  )}
                  <div className="preview-text">
                    <div className="preview-title">{post.linkPreview.title}</div>
                    <div className="preview-description">{post.linkPreview.description}</div>
                  </div>
                </div>
              </a>
            )}
            {!id && post.media && Array.isArray(post.media) && post.media.length > 0 && (
              <div className="media-grid">
                {post.media.map((m: string) => (
                  <img key={m} src={m} alt="media" className="media-item" />
                ))}
              </div>
            )}
            {!id && post.text && (
              <div className="post-text">{post.text}</div>
            )}
            
            {/* Comments section */}
            <div className="comments-section">
              <h3 className="comments-title">Comments ({topLevelReplies.length})</h3>
              {topLevelReplies.map((comment) => {
                const { authorAddress, chainName } = getAuthorInfo(comment);
                return (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      <div className="avatar-stack">
                        {chainName && chainName !== 'Legend' && (
                          <div className="chain-avatar">
                            <Identicon address={authorAddress} size={40} name={chainName} />
                          </div>
                        )}
                        {(!chainName || chainName === 'Legend') && (
                          <div className="address-avatar">
                            <Identicon address={authorAddress} size={40} />
                          </div>
                        )}
                        {chainName && chainName !== 'Legend' && (
                          <div className="address-avatar-overlay">
                            <Identicon address={authorAddress} size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <UserBadge 
                          address={authorAddress} 
                          showAvatar={false}
                          chainName={chainName}
                        />
                        {comment.timestamp && (
                          <span className="comment-timestamp">
                            {relativeTime(new Date(comment.timestamp))}
                          </span>
                        )}
                      </div>
                      <div className="comment-text">{comment.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        )}
      </div>
    </Shell>
  );
}


