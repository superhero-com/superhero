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
        // For comments, reference the parent post
        postMedia = [`comment:${postId}`];
      }

      const { decodedResult } = await contract.post_without_tip(
        trimmed,
        postMedia
      );
      console.log(
        `[PostForm] ${isPost ? "Post" : "Comment"} submitted`,
        decodedResult
      );

      if (isPost) {
        try {
          await PostsService.getById({
            id: `${decodedResult}_v3`,
          });
        } catch {}
      } else if (postId) {
        // Invalidate the post comments query for comments
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
      ? "Write a comment..."
      : "Connect your wallet to comment";
  }

  // If not connected and it's a comment, show simple message
  if (!activeAccount && !isPost) {
    return (
      <div
        className={`max-w-[680px] mx-auto mb-5 md:mx-3 md:mb-4 ${className}`}
      >
        <div className="bg-gradient-to-br from-white/8 to-white/3 border border-[var(--glass-border)] rounded-2xl p-5 transition-all duration-300 backdrop-blur-xl relative shadow-none md:rounded-2xl md:p-4">
          <div className="text-center text-white/70">
            <p className="text-sm">Please connect your wallet to comment</p>
          </div>
          <div className="mt-3 flex justify-center">
            <ConnectWalletButton block className="w-full md:w-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        isPost ? "w-full max-w-none" : "max-w-[680px] mx-auto md:mx-3"
      } mb-5 md:mb-4 ${className}`}
    >
      <div className="bg-gradient-to-br from-white/8 to-white/3 border border-[var(--glass-border)] rounded-2xl p-5 transition-all duration-300 backdrop-blur-xl relative shadow-none md:rounded-2xl md:p-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col gap-3">
            <div className="relative flex items-start gap-2 md:gap-2">
              {activeAccount && (
                <div className={`flex-shrink-0 self-start ${isPost ? "hidden md:block" : "hidden md:block"}`}>
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
              <textarea
                ref={textareaRef}
                placeholder={currentPlaceholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-white/7 border border-white/14 rounded-2xl p-4 pb-10 text-white text-base transition-all duration-200 outline-none caret-[#1161FE] resize-none leading-relaxed w-full box-border placeholder-white/60 font-medium focus:border-[#1161FE] focus:bg-white/10 focus:shadow-[0_0_0_2px_rgba(17,97,254,0.5),0_8px_24px_rgba(0,0,0,0.25)] md:p-4 md:pb-10 md:text-base md:rounded-2xl"
                style={{ minHeight }}
                rows={2}
                maxLength={characterLimit}
              />
              {characterLimit && (
                <div className="absolute bottom-3 right-4 text-white/60 text-sm font-semibold pointer-events-none">
                  {text.length}/{characterLimit}
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

          <div className="flex flex-col gap-3 pt-2.5 relative md:flex-row md:items-center md:justify-between md:gap-3 md:pt-3">
            {(showEmojiPicker || showGifInput) && (
              <div
                className={`flex gap-2.5 relative justify-center md:justify-start ${
                  activeAccount ? (isPost ? "md:pl-[56px]" : "md:pl-[56px]") : ""
                }`}
              >
                {showEmojiPicker && (
                  <button
                    type="button"
                    className="bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,255,157,0.2)] active:translate-y-0 flex-1 w-full md:flex-none md:w-auto md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm md:rounded-full"
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
                    className="bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,255,157,0.2)] active:translate-y-0 flex-1 w-full md:flex-none md:w-auto md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm md:rounded-full"
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
                        className="bg-white/8 border border-white/16 text-white px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/12 md:px-4 md:py-3 md:min-h-[44px] md:rounded-xl md:text-sm"
                        onClick={() => setShowGif(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="bg-primary-400 text-black border border-primary-400 px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-200 md:px-4 md:py-3 md:min-h-[44px] md:rounded-xl md:text-sm"
                        onClick={addGifFromUrl}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center w-full md:justify-end md:w-auto">
              {activeAccount ? (
                <AeButton
                  type="submit"
                  loading={isSubmitting}
                  disabled={!text.trim()}
                  className="relative bg-[#1161FE] border-none text-white font-black px-7 py-2.5 rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(0,0,0,0.3)] disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none w-full md:w-auto md:px-6 md:py-3 md:min-h-[44px] md:text-base md:rounded-full"
                >
                  {isSubmitting
                    ? isPost
                      ? "Posting…"
                      : "Posting..."
                    : isPost
                    ? "Post"
                    : "Post Comment"}
                </AeButton>
              ) : (
                <ConnectWalletButton block className="w-full md:w-auto" />
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { PostFormProps };
