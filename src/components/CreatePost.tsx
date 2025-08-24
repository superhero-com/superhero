import React, { useEffect, useRef, useState } from 'react';
import { IconClose, IconGif, IconImage, IconSmile } from '../icons';
import AeButton from './AeButton';
import './CreatePost.scss';
import Identicon from './Identicon';
import { useWallet, useAeternity } from '../hooks';
// @ts-ignore
import TIPPING_V3_ACI from 'tipping-contract/generated/Tipping_v3.aci.json';
import { PostsService } from '../api/generated';
import { CONFIG } from '../config';

interface CreatePostProps {
  onClose?: () => void;
  onSuccess?: () => void;
  className?: string;
  onTextChange?: (text: string) => void;
}

const DEFAULT_EMOJIS = [
  '😀', '😄', '😍', '🔥', '🚀', '✨', '🎉', '🙌', '🧠', '💡', '🧪', '🦾', '🤝', '💬', '🔗', '📈', '🧭', '🛠️', '🧩', '🦄',
];

const PROMPTS: string[] = [
  'Drop alpha: what’s cooking on æ today? 🚀',
  'Spill the tea ☕️ — wins, fails, spicy takes?',
  'GM makers. What are you shipping? 🧪',
  'Show & tell: graphs, code, memes 📈',
  'One hot take about æternity… go. 🔥',
  'Who should we vibe‑check? Tag ’em 👀',
  'What’s your builder ritual today? 🛠️',
  'If it compiles, it ships. What’s next? ⚙️',
  'Less talk, more blocks. What did you deploy? ⛓️',
  'Teach us something in 1 line. 🧠',
];

export default function CreatePost({ onClose, onSuccess, className = '', onTextChange }: CreatePostProps) {
  const { address, chainNames } = useWallet();
  const { scanForWallets, enableSdkWallet } = useAeternity();

  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifInput, setGifInput] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setPromptIndex(Math.floor(Math.random() * PROMPTS.length)); }, []);
  useEffect(() => {
    if (isExpanded) return;
    const id = window.setInterval(() => { setPromptIndex((i) => (i + 1) % PROMPTS.length); }, 8000);
    return () => window.clearInterval(id);
  }, [isExpanded]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  useEffect(() => { onTextChange?.(text); }, [text, onTextChange]);

  useEffect(() => { if (isExpanded && textareaRef.current) textareaRef.current.focus(); }, [isExpanded]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (emojiBtnRef.current && emojiBtnRef.current.contains(target)) return;
      if (gifBtnRef.current && gifBtnRef.current.contains(target)) return;
      const popovers = document.querySelectorAll('.popover');
      for (const p of Array.from(popovers)) if (p.contains(target)) return;
      setShowEmoji(false); setShowGif(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const insertAtCursor = (value: string) => {
    const el = textareaRef.current;
    if (!el) { setText(prev => prev + value); return; }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newValue = el.value.slice(0, start) + value + el.value.slice(end);
    setText(newValue);
    requestAnimationFrame(() => { el.focus(); const pos = start + value.length; el.setSelectionRange(pos, pos); });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!address) return;

    setIsSubmitting(true);
    try {
      let sdk: any = (window as any).__aeSdk;
      const hasActiveAccount = sdk && typeof sdk.addresses === 'function' && (sdk.addresses() || []).length > 0;
      if (!hasActiveAccount) {
        try {
          await scanForWallets();
          enableSdkWallet();
        } catch { }
        sdk = (window as any).__aeSdk;
      }
      if (!sdk || typeof sdk.signMessage !== 'function' || (sdk.addresses?.() || []).length === 0) {
        alert('Wallet not connected. Please connect your wallet and try again.');
        return;
      }
      if (!CONFIG.CONTRACT_V3_ADDRESS) {
        alert('Posting is not available: CONTRACT_V3_ADDRESS is not configured.');
        return;
      }
      const postMedia: string[] = [...mediaUrls];
      const contract = await sdk.initializeContract({ aci: TIPPING_V3_ACI as any, address: CONFIG.CONTRACT_V3_ADDRESS });
      const { decodedResult } = await contract.post_without_tip(trimmed, postMedia);
      try {
        await PostsService.getById({
          id: `${decodedResult}_v3`
        });
      } catch { }
      // try { await Backend.awaitTip(`${decodedResult}_v3`); } catch {}
      // Reset after success
      setText('');
      setMediaFiles([]);
      setMediaUrls([]);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setMediaFiles(prev => [...prev, ...files.slice(0, 4 - prev.length)]);
      files.slice(0, 4 - mediaFiles.length).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => { setMediaUrls(prev => [...prev, e.target?.result as string]); };
        reader.readAsDataURL(file);
      });
    }
  };

  const addGifFromUrl = () => {
    const url = gifInput.trim();
    if (!url) return;
    setMediaUrls(prev => [...prev, url]);
    setGifInput('');
    setShowGif(false);
  };

  const removeMedia = (index: number) => { setMediaFiles(prev => prev.filter((_, i) => i !== index)); setMediaUrls(prev => prev.filter((_, i) => i !== index)); };
  const handleExpand = () => { if (!isExpanded) setIsExpanded(true); };
  const handleClose = () => { if (isExpanded) { setIsExpanded(false); setText(''); setMediaFiles([]); setMediaUrls([]); } onClose?.(); };

  if (!address) {
    return (
      <div className={`create-post-container ${className}`}>
        <div className="create-post-box">
          <div className="create-post-placeholder">
            <div className="placeholder-icon">✍️</div>
            <div className="placeholder-text">Connect your wallet to start posting</div>
          </div>
        </div>
      </div>
    );
  }

  const chainName = chainNames?.[address || ''];
  const currentPrompt = PROMPTS[promptIndex];

  return (
    <div className={`create-post-container ${className}`}>
      <div className={`create-post-box ${isExpanded ? 'expanded' : ''}`}>
        {!isExpanded ? (
          <div className="create-post-trigger" onClick={handleExpand}>
            <div className="trigger-avatar"><Identicon address={address} size={40} name={chainName} /></div>
            <div className="trigger-text">{currentPrompt}</div>
            <div className="trigger-actions">
              <button className="action-button" title="Add image"><IconImage /></button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="create-post-form">
            <div className="form-header">
              <div className="form-avatar"><Identicon address={address} size={48} name={chainName} /></div>
              <button type="button" className="close-button" onClick={handleClose} title="Close"><IconClose /></button>
            </div>

            <div className="form-content">
              <textarea ref={textareaRef} placeholder={currentPrompt} value={text} onChange={(e) => setText(e.target.value)} className="text-input" rows={1} maxLength={280} />

              {mediaUrls.length > 0 && (
                <div className="media-preview">
                  {mediaUrls.map((url, index) => (
                    <div key={index} className="media-item">
                      {/.mp4$|.webm$|.mov$/i.test(url) ? (<video src={url} controls />) : (<img src={url} alt="media" />)}
                      <button type="button" className="remove-media" onClick={() => removeMedia(index)}><IconClose /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-footer">
              <div className="footer-left">
                <button type="button" className="media-button" onClick={() => fileInputRef.current?.click()} disabled={mediaFiles.length >= 4}><IconImage /><span>Media</span></button>
                <button type="button" className="link-button" title="Emoji" ref={emojiBtnRef} onClick={() => { setShowEmoji(s => !s); setShowGif(false); }}><IconSmile /><span>Emoji</span></button>
                <button type="button" className="link-button" title="GIF" ref={gifBtnRef} onClick={() => { setShowGif(s => !s); setShowEmoji(false); }}><IconGif /><span>GIF</span></button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                {showEmoji && (
                  <div className="popover emoji-popover">
                    <div className="emoji-grid">{DEFAULT_EMOJIS.map((e) => (<button key={e} type="button" className="emoji-btn" onClick={() => insertAtCursor(e)}>{e}</button>))}</div>
                    <div className="emoji-hint">More soon…</div>
                  </div>
                )}
                {showGif && (
                  <div className="popover gif-popover">
                    <div className="gif-title">Add a GIF</div>
                    <input type="url" placeholder="Paste GIF/Video URL" value={gifInput} onChange={(e) => setGifInput(e.target.value)} className="gif-input" />
                    <div className="gif-actions">
                      <button type="button" className="gif-cancel" onClick={() => setShowGif(false)}>Cancel</button>
                      <button type="button" className="gif-add" onClick={addGifFromUrl}>Add</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="footer-right">
                <div className="character-count">{text.length}/280</div>
                <AeButton type="submit" loading={isSubmitting} disabled={!text.trim()} className="submit-button">{isSubmitting ? 'Posting…' : 'Post'}</AeButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
