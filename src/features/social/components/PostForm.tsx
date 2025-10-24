import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useCallback } from "react";
import AeButton from "../../../components/AeButton";
import ConnectWalletButton from "../../../components/ConnectWalletButton";
import { IconClose, IconGif, IconSmile } from "../../../icons";
// @ts-ignore
import { useQueryClient } from "@tanstack/react-query";
import TIPPING_V3_ACI from "tipping-contract/generated/Tipping_v3.aci.json";
import { PostsService } from "../../../api/generated";
import { CONFIG } from "../../../config";
import { useAccount } from "../../../hooks/useAccount";
import { useAeSdk } from "../../../hooks/useAeSdk";
import { GifSelectorDialog } from "./GifSelectorDialog";
import { usePluginHostCtx } from "@/features/social/plugins/PluginHostProvider";
import { composerRegistry, attachmentRegistry } from "@/features/social/plugins/registries";
import { getAllPlugins } from "@/features/social/feed-plugins/registry";

interface PostFormProps {
  // Common props
  onClose?: () => void;
  onSuccess?: () => void;
  className?: string;
  onTextChange?: (text: string) => void;

  // Post-specific props
  isPost?: boolean;

  // Comment-specific props
  postId?: string;
  onCommentAdded?: () => void;
  placeholder?: string;

  // Topic enforcement
  initialText?: string; // prefilled content (e.g., "#nancy ")
  requiredHashtag?: string; // canonical, lowercase content hashtag (e.g., "#nancy")

  // Feature toggles
  showMediaFeatures?: boolean;
  showEmojiPicker?: boolean;
  showGifInput?: boolean;
  characterLimit?: number;
  minHeight?: string;
  autoFocus?: boolean;
}

const DEFAULT_EMOJIS = [
  "😀",
  "😄",
  "😍",
  "🔥",
  "🚀",
  "✨",
  "🎉",
  "🙌",
  "🧠",
  "💡",
  "🧪",
  "🦾",
  "🤝",
  "💬",
  "🔗",
  "📈",
  "🧭",
  "🛠️",
  "🧩",
  "🦄",
];

const PROMPTS: string[] = [
  "Drop alpha: what's cooking on æ today? 🚀",
  "Spill the tea ☕️ — wins, fails, spicy takes?",
  "GM makers. What are you shipping? 🧪",
  "Show & tell: graphs, code, memes 📈",
  "One hot take about æternity… go. 🔥",
  "Who should we vibe‑check? Tag 'em 👀",
  "What's your builder ritual today? 🛠️",
  "If it compiles, it ships. What's next? ⚙️",
  "Less talk, more blocks. What did you deploy? ⛓️",
  "Teach us something in 1 line. 🧠",
];

const PostForm = forwardRef<{ focus: () => void }, PostFormProps>((props, ref) => {
  const {
    onClose,
    onSuccess,
    className = "",
    onTextChange,
    isPost = true,
    postId,
    onCommentAdded,
    placeholder,
    initialText,
    requiredHashtag,
    showMediaFeatures = true,
    showEmojiPicker = true,
    showGifInput = true,
    characterLimit = 280,
    minHeight = "60px",
    autoFocus = false,
  } = props;
  const { sdk } = useAeSdk();
  const { activeAccount, chainNames } = useAccount();
  const queryClient = useQueryClient();

  useImperativeHandle(ref, () => ({
    focus: () => {
      // Use setTimeout to ensure focus happens after any ongoing UI updates
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // On mobile, also scroll into view
          textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    },
  }));

  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const [overlayComputed, setOverlayComputed] = useState<{ paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number; fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string; } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Plugin composer actions
  const host = usePluginHostCtx();
  const composerCtx = useMemo(() => ({
    ...host,
    insertText: (t: string) => {
      setText((prev) => {
        const needsSpace = prev.length > 0 && !/\s$/.test(prev);
        return `${prev}${needsSpace ? ' ' : ''}${t}`;
      });
    },
  }), [host]);
  const composerActions = useMemo(() => {
    const fromRegistry = composerRegistry.flatMap((r) => r.getActions(composerCtx));
    const fromFeedPlugins = getAllPlugins()
      .flatMap((p: any) => (typeof p.getComposerActions === 'function' ? p.getComposerActions(composerCtx) : []));
    return [...fromFeedPlugins, ...fromRegistry];
  }, [composerCtx]);

  // Attachments state (single active attachment; poll blocks others)
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [attachmentState, setAttachmentState] = useState<Record<string, any>>({});
  const setAttachmentValue = useCallback((ns: string, value: any) => {
    setAttachmentState((prev) => ({ ...prev, [ns]: value }));
  }, []);
  const getAttachmentValue = useCallback(<T = any,>(ns: string): T | undefined => {
    return attachmentState[ns] as T | undefined;
  }, [attachmentState]);

  const attachmentsCtx = useMemo(() => ({
    ...composerCtx,
    getValue: getAttachmentValue,
    setValue: setAttachmentValue,
    ensureWallet: async () => ({ sdk, currentBlockHeight: (useAeSdk() as any)?.currentBlockHeight }),
    cacheLink: (postId: string, kind: string, payload: any) => {
      try {
        const key = 'sh:plugin:post-links';
        const curr = JSON.parse(localStorage.getItem(key) || '{}');
        const next = { ...(curr || {}) };
        next[String(postId)] = { kind, payload, updatedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('sh:plugin:post-links:update', { detail: { postId, kind, payload } }));
      } catch {}
    },
    pushFeedEntry: (kind: string, entry: any) => {
      try { window.dispatchEvent(new CustomEvent('sh:plugin:feed:push', { detail: { kind, entry } })); } catch {}
    },
  }), [composerCtx, getAttachmentValue, setAttachmentValue, sdk]);

  const enableAttachments = (CONFIG.UNFINISHED_FEATURES || '').includes('composer-attachments');
  const pollActive = enableAttachments && Boolean(activeAttachmentId);

  // If poll panel opens, hide/close GIF picker
  useEffect(() => {
    if (pollActive) setShowGif(false);
  }, [pollActive]);

  useEffect(() => {
    setPromptIndex(Math.floor(Math.random() * PROMPTS.length));
  }, []);

  // Do not auto-fill from initialText anymore; keep user input empty by default

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  // Sync overlay typography and padding with the textarea for precise positioning
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    setOverlayComputed({
      paddingTop: parseFloat(cs.paddingTop || '0'),
      paddingRight: parseFloat(cs.paddingRight || '0'),
      paddingBottom: parseFloat(cs.paddingBottom || '0'),
      paddingLeft: parseFloat(cs.paddingLeft || '0'),
      fontFamily: cs.fontFamily || 'inherit',
      fontSize: cs.fontSize || 'inherit',
      fontWeight: cs.fontWeight || 'inherit',
      lineHeight: cs.lineHeight || 'normal',
      letterSpacing: cs.letterSpacing || 'normal',
    });
  }, [text]);

  useEffect(() => {
    onTextChange?.(text);
  }, [text, onTextChange]);

  useEffect(() => {
    // Avoid auto-focusing on mobile to prevent keyboard popping up
    const isDesktop = typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 768px)').matches;
    if ((isDesktop || autoFocus) && textareaRef.current) textareaRef.current.focus();
  }, [autoFocus]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (emojiBtnRef.current && emojiBtnRef.current.contains(target)) return;
      if (gifBtnRef.current && gifBtnRef.current.contains(target)) return;
      const popovers = document.querySelectorAll(".popover");
      for (const p of Array.from(popovers)) if (p.contains(target)) return;
      setShowEmoji(false);
      // setShowGif(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const insertAtCursor = (value: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + value);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newValue = el.value.slice(0, start) + value + el.value.slice(end);
    setText(newValue);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + value.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Do not auto-append the required hashtag; the Post button is disabled until present
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!activeAccount) return;

    setIsSubmitting(true);
    try {
      const contract = await sdk.initializeContract({
        aci: TIPPING_V3_ACI as any,
        address: CONFIG.CONTRACT_V3_ADDRESS as `ct_${string}`,
      });

      let postMedia: string[] = [];

      if (isPost) {
        // For posts, include media URLs
        postMedia = [...mediaUrls];
      } else if (postId) {

        postMedia = [`comment:${postId}`, ...mediaUrls];
      }

      const { decodedResult } = await contract.post_without_tip(
        trimmed,
        postMedia
      );

      if (isPost) {
        try {
          const created = await PostsService.getById({ id: `${decodedResult}_v3` });
          // Optimistically prepend the new post to the topic feed cache so it appears immediately
          if (requiredHashtag && !requiredMissing) {
            const topicKey = ["topic-by-name", (requiredHashtag || '').toLowerCase()];
            queryClient.setQueryData(topicKey, (old: any) => {
              const prevPosts = Array.isArray(old?.posts) ? old.posts : [];
              return {
                ...(old || {}),
                posts: [created as any, ...prevPosts],
                post_count: typeof old?.post_count === 'number' ? old.post_count + 1 : old?.post_count,
              };
            });
          }
        } catch { }
      } else if (postId) {
        // For replies: optimistically show the new reply immediately
        try {
          const newReply = await PostsService.getById({ id: `${String(decodedResult).replace(/_v3$/,'')}_v3` });
          // Update infinite replies list if present
          queryClient.setQueryData(["post-comments", postId, "infinite"], (old: any) => {
            if (!old) {
              return {
                pageParams: [1],
                pages: [ { items: [newReply], meta: { currentPage: 1, totalPages: 1 } } ],
              };
            }
            const firstPage = old.pages?.[0] || { items: [], meta: old.pages?.[0]?.meta };
            const nextFirst = { ...firstPage, items: [newReply, ...(firstPage.items || [])] };
            return { ...old, pages: [nextFirst, ...old.pages.slice(1)] };
          });
          // Update non-infinite comments list if present
          queryClient.setQueryData(["post-comments", postId], (old: any) => {
            if (!Array.isArray(old)) return [newReply];
            return [newReply, ...old];
          });
        } catch {}
        // Also trigger a refetch in the background to pick up any server-side changes
        queryClient.refetchQueries({ queryKey: ["post-comments", postId] });
        onCommentAdded?.();
      }

      // Reset after success
      setText(initialText || "");
      setMediaUrls([]);
      onSuccess?.();
      // Also refetch any topic feeds related to this hashtag so other viewers update quickly
      try {
        if (requiredHashtag) {
          queryClient.invalidateQueries({ queryKey: ["topic-by-name"] });
        }
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Dynamic placeholder logic
  let currentPlaceholder: string;
  if (placeholder) {
    currentPlaceholder = placeholder;
  } else if (isPost) {
    currentPlaceholder = activeAccount
      ? PROMPTS[promptIndex]
      : "Connect your Superhero Wallet to start posting on-chain ✍️";
  } else {
    currentPlaceholder = activeAccount
      ? "Write a reply..."
      : "Connect your wallet to reply";
  }

  // If not connected and it's a reply, show simple message
  if (!activeAccount && !isPost) {
    return (
      <div
        className={`mx-auto mb-5 md:mb-4 ${className}`}
      >
        <div className="bg-transparent border-none p-0 rounded-xl transition-all duration-300 relative shadow-none md:bg-gradient-to-br md:from-white/8 md:to-white/3 md:border md:border-white/10 md:outline md:outline-1 md:outline-white/10 md:rounded-2xl md:p-4 md:backdrop-blur-xl">
          <div className="text-center text-white/70">
            <p className="text-sm">Please connect your wallet to reply</p>
          </div>
          <div className="mt-3 flex justify-center">
            <ConnectWalletButton block className="w-full md:w-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Use a slightly taller min height on mobile for better ergonomics
  const isDesktopViewport = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(min-width: 768px)').matches;
  const computedMinHeight = isDesktopViewport ? minHeight : '88px';

  const requiredMissing = useMemo(() => {
    if (!requiredHashtag) return false;
    const escaped = String(requiredHashtag).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Consider the tag present if it appears as a standalone hashtag token anywhere in the text
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'i');
    return !pattern.test(text);
  }, [text, requiredHashtag]);

  // Inline autocomplete: when typing a hashtag token that matches the start of requiredHashtag,
  // show only the remaining characters (e.g., "#a" -> suggest "ENS").
  const caretPosition = textareaRef.current?.selectionStart ?? text.length;
  const textBeforeCaret = text.slice(0, caretPosition);
  const activeHashtagMatch = textBeforeCaret.match(/(^|\s)#([a-zA-Z0-9_]*)$/);
  const typedHashtagBody = activeHashtagMatch ? activeHashtagMatch[2] : '';
  const requiredLower = (requiredHashtag || '').toLowerCase();
  const typedLowerWithHash = `#${typedHashtagBody}`.toLowerCase();
  const matchesRequiredPrefix = requiredHashtag
    ? requiredLower.startsWith(typedLowerWithHash)
    : false;
  const remainingSuggestion = matchesRequiredPrefix
    ? (requiredHashtag || '').toUpperCase().slice(1 + typedHashtagBody.length)
    : '';
  const showAutoComplete = Boolean(
    requiredHashtag &&
    requiredMissing &&
    activeHashtagMatch &&
    matchesRequiredPrefix &&
    remainingSuggestion.length > 0
  );

  // Measure the pixel width of the prefix using canvas to fine-tune horizontal placement
  const measuredLeft = useMemo(() => {
    if (!overlayComputed) return 0;
    const el = textareaRef.current;
    if (!el) return 0;
    const canvas = canvasRef.current || (canvasRef.current = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    ctx.font = `${overlayComputed.fontWeight} ${overlayComputed.fontSize} ${overlayComputed.fontFamily}`;
    // Only measure the current token since last space/newline for stability
    const prefix = textBeforeCaret.slice(textBeforeCaret.lastIndexOf('\n') + 1);
    const metrics = ctx.measureText(prefix);
    const base = metrics.width;
    // Approximate letterSpacing effect
    const ls = parseFloat(overlayComputed.letterSpacing as any) || 0;
    const extra = ls * Math.max(prefix.length - 1, 0);
    return overlayComputed.paddingLeft + base + extra;
  }, [overlayComputed, textBeforeCaret]);

  return (
    <div
      className={`${isPost ? "w-full max-w-none" : "mx-auto"
        } mb-2 md:mb-4 ${className}`}
    >
      <div className="bg-transparent border-none p-0 rounded-xl transition-all duration-300 relative shadow-none md:bg-gradient-to-br md:from-white/8 md:to-white/3 md:border md:border-white/10 md:outline md:outline-1 md:outline-white/10 md:rounded-2xl md:p-4 md:backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col gap-3 md:grid md:grid-cols-[56px_1fr] md:gap-x-0 md:gap-y-3">
            {activeAccount && (
              <div className="hidden md:block">
                <AddressAvatarWithChainName
                  address={activeAccount}
                  size={40}
                  overlaySize={20}
                  isHoverEnabled={true}
                  showAddressAndChainName={false}
                  className=""
                />
              </div>
            )}
            <div className={activeAccount ? "md:col-start-2" : "md:col-span-2"}>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  placeholder={currentPlaceholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (!requiredHashtag || !showAutoComplete) return;
                    if (e.key === 'Tab' || e.key === 'Enter') {
                      e.preventDefault();
                      const el = textareaRef.current;
                      const caret = el?.selectionStart ?? text.length;
                      // Compute start index of current hashtag token (including '#')
                      const tokenStart = caret - (typedHashtagBody.length + 1);
                      const before = text.slice(0, tokenStart);
                      const after = text.slice(caret);
                      const fullUpper = (requiredHashtag || '').toUpperCase();
                      const nextValue = `${before}${fullUpper} ${after}`;
                      setText(nextValue);
                      requestAnimationFrame(() => {
                        const pos = (before + fullUpper + ' ').length;
                        if (el) {
                          el.focus();
                          el.setSelectionRange(pos, pos);
                        }
                      });
                    }
                  }}
                  className="bg-white/7 border border-white/14 rounded-xl md:rounded-2xl pt-1.5 pr-2.5 pl-2.5 pb-9 text-white text-base transition-all duration-200 outline-none caret-[#1161FE] resize-none leading-snug md:leading-relaxed w-full box-border placeholder-white/60 font-medium focus:border-[#1161FE] focus:bg-white/10 focus:shadow-[0_0_0_2px_rgba(17,97,254,0.5),0_8px_24px_rgba(0,0,0,0.25)] md:p-4 md:pr-14 md:pb-12 md:text-base"
                  style={{ minHeight: computedMinHeight }}
                  rows={2}
                  maxLength={characterLimit}
                />

                {showAutoComplete && overlayComputed && (
                  <div
                    className="absolute pointer-events-none select-none"
                    style={{
                      top: overlayComputed.paddingTop - 1,
                      left: measuredLeft,
                      fontFamily: overlayComputed.fontFamily,
                      fontSize: overlayComputed.fontSize,
                      fontWeight: overlayComputed.fontWeight,
                      lineHeight: overlayComputed.lineHeight,
                      letterSpacing: overlayComputed.letterSpacing,
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{remainingSuggestion}</span>
                  </div>
                )}

                <div className="md:hidden absolute bottom-5 left-2">
                  {/* Mobile-only GIF button inside textarea corner */}
                  {showGifInput && (
                    <button
                      type="button"
                      className="md:hidden  inline-flex items-center h-5 px-2 rounded-[calc(var(--radius)-2px)] md:rounded-full bg-transparent border border-white/10 outline outline-1 outline-white/10 text-white/80 text-[11px] leading-none hover:border-white/20 transition-colors min-h-0 min-w-0 z-20 touch-manipulation"
                      title="GIF"
                      ref={gifBtnRef}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowGif((s) => !s);
                        setShowEmoji(false);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowGif((s) => !s);
                        setShowEmoji(false);
                      }}
                    >
                      <span className="uppercase tracking-wide">GIF</span>
                    </button>
                  )}
                </div>
                {characterLimit && (
                  <div className="absolute bottom-4 right-2 md:bottom-4 md:right-4 text-white/60 text-sm font-semibold pointer-events-none select-none">
                    {text.length}/{characterLimit}
                  </div>
                )}



              </div>

              {/* Attachment panel mount (single active) under textarea, above Post button */}
              {enableAttachments && activeAttachmentId && (
                <div className="mt-3">
                  {attachmentRegistry
                    .filter((a) => a.id === activeAttachmentId)
                    .map((a) => (
                      <a.Panel key={a.id} ctx={attachmentsCtx} onRemove={() => setActiveAttachmentId(null)} />
                    ))}
                </div>
              )}

              {(showEmojiPicker || showGifInput) && (
                <div className="hidden md:flex items-center justify-between mt-3 gap-3">
                  <div className="flex items-center gap-2.5 relative">
                    {/* Attachments toolbar: show Poll button; disable others when active */}
                    {enableAttachments && attachmentRegistry.length > 0 && (
                      <div className="inline-flex items-center gap-2.5">
                        {attachmentRegistry.map((spec) => (
                          <button
                            key={spec.id}
                            type="button"
                            disabled={!!activeAttachmentId && activeAttachmentId !== spec.id}
                            onClick={() => setActiveAttachmentId((id) => (id === spec.id ? null : spec.id))}
                            className="bg-white/5 border border-white/10 text-white/70 px-3 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm disabled:opacity-50"
                            title={spec.label}
                          >
                            {spec.Icon ? <spec.Icon className="w-4 h-4" /> : null}
                            <span>{activeAttachmentId === spec.id ? 'Remove poll' : spec.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showEmojiPicker && (
                      <button
                        type="button"
                        className="bg-white/5 border border-white/10 text-white/70 px-3 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,255,157,0.2)] active:translate-y-0 md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm"
                        title="Emoji"
                        ref={emojiBtnRef}
                        onClick={() => {
                          setShowEmoji((s) => !s);
                          setShowGif(false);
                        }}
                      >
                        <IconSmile className="w-4 h-4" />
                        <span>Emoji</span>
                      </button>
                    )}

                    {showGifInput && !pollActive && (
                      <button
                        type="button"
                        className="bg-white/5 border border-white/10 text-white/70 px-3 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,255,157,0.2)] active:translate-y-0 md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm"
                        title="GIF"
                        ref={gifBtnRef}
                        onClick={() => {
                          setShowGif((s) => !s);
                          setShowEmoji(false);
                        }}
                      >
                        <IconGif className="w-4 h-4" />
                        <span>GIF</span>
                      </button>
                    )}

                    {showEmojiPicker && showEmoji && (
                      <div className="absolute bottom-[110%] left-0 bg-gray-900 border border-white/12 rounded-2xl p-2.5 shadow-[0_16px_30px_rgba(0,0,0,0.4)] z-10 min-w-[240px] md:fixed md:bottom-5 md:left-5 md:right-5 md:min-w-auto md:max-w-none md:rounded-2xl md:p-4 md:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                        <div className="grid grid-cols-10 gap-1.5 md:grid-cols-8 md:gap-2">
                          {DEFAULT_EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              className="bg-none border-none text-xl p-1.5 cursor-pointer rounded-lg hover:bg-white/10 md:p-2 md:text-[22px] md:min-h-[44px] md:rounded-xl"
                              onClick={() => insertAtCursor(e)}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1.5 text-center text-sm text-white/90">
                          More soon…
                        </div>
                      </div>
                    )}

                    {showGifInput && !pollActive && (
                      <GifSelectorDialog
                        open={showGif}
                        onOpenChange={setShowGif}
                        mediaUrls={mediaUrls}
                        onMediaUrlsChange={setMediaUrls}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {composerActions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="bg-white/5 border border-white/10 text-white/70 px-3 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm"
                        onClick={() => a.onClick(composerCtx)}
                      >
                        {a.Icon ? <a.Icon className="w-4 h-4" /> : null}
                        <span>{a.label}</span>
                      </button>
                    ))}
                    {requiredHashtag && requiredMissing && (
                      <div className="flex items-center gap-2 text-[11px] text-white/70">
                        <span>Post needs to include {(requiredHashtag || '').toUpperCase()}</span>
                        <button
                          type="button"
                          className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors"
                          onClick={() => {
                            const tag = (requiredHashtag || '').toUpperCase();
                            const needsSpace = text.length > 0 && !/\s$/.test(text);
                            const next = `${text}${needsSpace ? ' ' : ''}${tag} `;
                            setText(next);
                            requestAnimationFrame(() => {
                              if (textareaRef.current) {
                                const pos = next.length;
                                textareaRef.current.focus();
                                textareaRef.current.setSelectionRange(pos, pos);
                              }
                            });
                          }}
                          title="Add required hashtag"
                        >
                          +Add
                        </button>
                      </div>
                    )}
                    {activeAccount ? (
                      <AeButton
                        type="submit"
                        loading={isSubmitting}
                        disabled={!text.trim() || (requiredHashtag ? requiredMissing : false)}
                        className="relative bg-[#1161FE] border-none text-white font-black px-6 py-3 rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(0,0,0,0.3)] disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none md:min-h-[44px] md:text-base"
                      >
                        {pollActive ? 'Start poll · ' : ''}
                        {isSubmitting
                          ? isPost
                            ? "Posting…"
                            : "Posting..."
                          : isPost
                            ? "Post"
                            : "Post Reply"}
                      </AeButton>
                    ) : (
                      <ConnectWalletButton className="rounded-full" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {showMediaFeatures && mediaUrls.length > 0 && (
              <div className="col-span-full md:col-start-2 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex flex-row gap-3 pb-2">
                  {mediaUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative rounded-xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.25)] flex-shrink-0 w-[200px] md:w-[180px]"
                    >
                      {/.mp4$|.webm$|.mov$/i.test(url) ? (
                        <video
                          src={url}
                          controls
                          className="w-full h-[200px] md:h-[180px] object-cover block"
                        />
                      ) : (
                        <img
                          src={url}
                          alt="media"
                          className="w-full h-[200px] md:h-[180px] object-cover block"
                        />
                      )}
                      <button
                        type="button"
                        className="absolute top-1.5 right-1.5 bg-black/70 border-none text-white w-7 h-7 rounded-full cursor-pointer grid place-items-center transition-all duration-200 hover:bg-black/90 hover:scale-105 active:scale-95"
                        onClick={() => removeMedia(index)}
                      >
                        <IconClose className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center w-full pt-0 -mt-3 md:hidden">
            <div className="flex flex-col items-center justify-center w-full">
            {requiredHashtag && requiredMissing && (
              <div className="w-full mb-2 flex items-center justify-center gap-2 text-[12px] text-white/70">
                <span>Post needs to include {(requiredHashtag || '').toUpperCase()}</span>
                <button
                  type="button"
                  className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors"
                  onClick={() => {
                    const tag = (requiredHashtag || '').toUpperCase();
                    const needsSpace = text.length > 0 && !/\s$/.test(text);
                    const next = `${text}${needsSpace ? ' ' : ''}${tag} `;
                    setText(next);
                    requestAnimationFrame(() => {
                      if (textareaRef.current) {
                        const pos = next.length;
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(pos, pos);
                      }
                    });
                  }}
                  title="Add required hashtag"
                >
                  +Add
                </button>
              </div>
            )}
              {activeAccount ? (
                <AeButton
                  type="submit"
                  loading={isSubmitting}
                  disabled={!text.trim() || (requiredHashtag ? requiredMissing : false)}
                  className="relative bg-[#1161FE] border-none text-white font-black px-5 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(0,0,0,0.3)] disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none w-full md:w-auto md:px-6 md:py-3 md:min-h-[44px] md:text-base"
                >
                  {isSubmitting
                    ? isPost
                      ? "Posting…"
                      : "Posting..."
                    : isPost
                      ? "Post"
                      : "Post Reply"}
                </AeButton>
              ) : (
                <ConnectWalletButton block className="w-full rounded-xl md:rounded-full" />
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
});

PostForm.displayName = 'PostForm';

export default PostForm;
export type { PostFormProps };
