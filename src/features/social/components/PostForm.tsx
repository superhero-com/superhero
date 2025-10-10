import React, { useEffect, useRef, useState } from "react";
import { IconClose, IconGif, IconImage, IconSmile } from "../../../icons";
import AeButton from "../../../components/AeButton";
import ConnectWalletButton from "../../../components/ConnectWalletButton";
import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
// @ts-ignore
import TIPPING_V3_ACI from "tipping-contract/generated/Tipping_v3.aci.json";
import { PostsService } from "../../../api/generated";
import { CONFIG } from "../../../config";
import { useAccount } from "../../../hooks/useAccount";
import { useAeSdk } from "../../../hooks/useAeSdk";
import { useQueryClient } from "@tanstack/react-query";

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

  // Feature toggles
  showMediaFeatures?: boolean;
  showEmojiPicker?: boolean;
  showGifInput?: boolean;
  characterLimit?: number;
  minHeight?: string;
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

export default function PostForm({
  onClose,
  onSuccess,
  className = "",
  onTextChange,
  isPost = true,
  postId,
  onCommentAdded,
  placeholder,
  showMediaFeatures = true,
  showEmojiPicker = true,
  showGifInput = true,
  characterLimit = 280,
  minHeight = "60px",
}: PostFormProps) {
  const { sdk } = useAeSdk();
  const { activeAccount, chainNames } = useAccount();
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifInput, setGifInput] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPromptIndex(Math.floor(Math.random() * PROMPTS.length));
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  useEffect(() => {
    onTextChange?.(text);
  }, [text, onTextChange]);

  useEffect(() => {
    // Avoid auto-focusing on mobile to prevent keyboard popping up
    const isDesktop = typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop && textareaRef.current) textareaRef.current.focus();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (emojiBtnRef.current && emojiBtnRef.current.contains(target)) return;
      if (gifBtnRef.current && gifBtnRef.current.contains(target)) return;
      const popovers = document.querySelectorAll(".popover");
      for (const p of Array.from(popovers)) if (p.contains(target)) return;
      setShowEmoji(false);
      setShowGif(false);
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
        // For replies, reference the parent post
        postMedia = [`comment:${postId}`];
      }

      const { decodedResult } = await contract.post_without_tip(
        trimmed,
        postMedia
      );
      console.log(
        `[PostForm] ${isPost ? "Post" : "Reply"} submitted`,
        decodedResult
      );

      if (isPost) {
        try {
          await PostsService.getById({
            id: `${decodedResult}_v3`,
          });
        } catch {}
      } else if (postId) {
        // Invalidate the post comments query for replies
        queryClient.refetchQueries({ queryKey: ["post-comments", postId] });
        onCommentAdded?.();
      }

      // Reset after success
      setText("");
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
      setMediaFiles((prev) => [...prev, ...files.slice(0, 4 - prev.length)]);
      files.slice(0, 4 - mediaFiles.length).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaUrls((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const addGifFromUrl = () => {
    const url = gifInput.trim();
    if (!url) return;
    setMediaUrls((prev) => [...prev, url]);
    setGifInput("");
    setShowGif(false);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setText("");
    setMediaFiles([]);
    setMediaUrls([]);
    onClose?.();
  };

  const chainName = chainNames?.[activeAccount || ""];

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

  return (
    <div
      className={`${
        isPost ? "w-full max-w-none" : "mx-auto"
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
                className="bg-white/7 border border-white/14 rounded-xl md:rounded-2xl pt-1.5 pr-2.5 pl-2.5 pb-9 text-white text-base transition-all duration-200 outline-none caret-[#1161FE] resize-none leading-snug md:leading-relaxed w-full box-border placeholder-white/60 font-medium focus:border-[#1161FE] focus:bg-white/10 focus:shadow-[0_0_0_2px_rgba(17,97,254,0.5),0_8px_24px_rgba(0,0,0,0.25)] md:p-4 md:pr-14 md:pb-12 md:text-base"
                style={{ minHeight: computedMinHeight }}
                rows={2}
                maxLength={characterLimit}
              />
              
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
                {/* Mobile-only GIF popover anchored to button */}
                {showGifInput && showGif && (
                  <div className="md:hidden absolute top-0 left-2 bg-gray-900 border border-white/12 rounded-2xl p-3.5 shadow-[0_16px_30px_rgba(0,0,0,0.4)] z-30 min-w-[240px] max-w-[calc(100vw-2rem)] right-2">
                    <div className="font-bold mb-2.5 text-white">Add a GIF</div>
                    <input
                      type="url"
                      placeholder="Paste GIF/Video URL"
                      value={gifInput}
                      onChange={(e) => setGifInput(e.target.value)}
                      className="w-full bg-white/8 border border-white/16 rounded-xl p-2.5 text-white text-sm"
                    />
                    <div className="mt-2.5 flex justify-end gap-2.5">
                      <button
                        type="button"
                        className="bg-white/8 border border-white/16 text-white px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/12"
                        onClick={() => setShowGif(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="bg-primary-400 text-black border border-primary-400 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200"
                        onClick={addGifFromUrl}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {characterLimit && (
                <div className="absolute bottom-4 right-2 md:bottom-4 md:right-4 text-white/60 text-sm font-semibold pointer-events-none select-none">
                  {text.length}/{characterLimit}
                </div>
              )}


             
              </div>

              {(showEmojiPicker || showGifInput) && (
                <div className="hidden md:flex items-center justify-between mt-3 gap-3">
                  <div className="flex items-center gap-2.5 relative">
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

                    {showGifInput && (
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

                    {showGifInput && showGif && (
                      <div className="absolute bottom-[110%] left-0 bg-gray-900 border border-white/12 rounded-2xl p-3.5 shadow-[0_16px_30px_rgba(0,0,0,0.4)] z-10 min-w-[240px] md:fixed md:bottom-5 md:left-5 md:right-5 md:min-w-auto md:max-w-none md:rounded-2xl md:p-4 md:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                        <div className="font-bold mb-2.5 text-white">Add a GIF</div>
                        <input
                          type="url"
                          placeholder="Paste GIF/Video URL"
                          value={gifInput}
                          onChange={(e) => setGifInput(e.target.value)}
                          className="w-full bg-white/8 border border-white/16 rounded-xl p-2.5 text-white text-sm md:p-3 md:text-base md:rounded-xl md:min-h-[44px]"
                        />
                        <div className="mt-2.5 flex justify-end gap-2.5 md:mt-3 md:gap-3">
                          <button
                            type="button"
                            className="bg-white/8 border border-white/16 text-white px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/12 md:px-4 md:py-3 md:min-h-[44px] md:rounded-xl md:text-sm"
                            onClick={() => setShowGif(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="bg-primary-400 text-black border border-primary-400 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 md:px-4 md:py-3 md:min-h-[44px] md:rounded-xl md:text-sm"
                            onClick={addGifFromUrl}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    {activeAccount ? (
                      <AeButton
                        type="submit"
                        loading={isSubmitting}
                        disabled={!text.trim()}
                        className="relative bg-[#1161FE] border-none text-white font-black px-6 py-3 rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(0,0,0,0.3)] disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none md:min-h-[44px] md:text-base"
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
                      <ConnectWalletButton className="rounded-full" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {showMediaFeatures && mediaUrls.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] md:gap-3">
                {mediaUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative rounded-xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                  >
                    {/.mp4$|.webm$|.mov$/i.test(url) ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-45 object-cover block md:h-40"
                      />
                    ) : (
                      <img
                        src={url}
                        alt="media"
                        className="w-full h-45 object-cover block md:h-40"
                      />
                    )}
                    <button
                      type="button"
                      className="absolute top-1.5 right-1.5 bg-black/70 border-none text-white w-7 h-7 rounded-full cursor-pointer grid place-items-center transition-all duration-200 hover:bg-black/90 hover:scale-105"
                      onClick={() => removeMedia(index)}
                    >
                      <IconClose className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center w-full pt-0 -mt-3 md:hidden">
            <div className="flex items-center justify-center w-full">
              {activeAccount ? (
                <AeButton
                  type="submit"
                  loading={isSubmitting}
                  disabled={!text.trim()}
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
}

export type { PostFormProps };
