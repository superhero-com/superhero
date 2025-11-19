import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
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

interface PostFormProps {
  // Common props
  onClose?: () => void;
  onSuccess?: () => void;
  className?: string;
  onTextChange?: (text: string) => void;

  // Post-specific props
  isPost?: boolean;
  onPostCreated?: () => void; // Callback when a new post is created (for tab switching, etc.)

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

const PostForm = forwardRef<{ focus: (opts?: { immediate?: boolean; preventScroll?: boolean; scroll?: 'none' | 'start' | 'center' }) => void }, PostFormProps>((props, ref) => {
  const { t } = useTranslation('forms');
  const { t: tSocial } = useTranslation('social');
  const {
    onClose,
    onSuccess,
    className = "",
    onTextChange,
    isPost = true,
    postId,
    onCommentAdded,
    onPostCreated,
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
    focus: (opts?: { immediate?: boolean; preventScroll?: boolean; scroll?: 'none' | 'start' | 'center' }) => {
      const run = () => {
        if (!textareaRef.current) return;
        try {
          // Optionally prevent browser auto-scroll on focus
          const ps = opts?.preventScroll ?? true;
          (textareaRef.current as any).focus?.({ preventScroll: ps });
        } catch {
          textareaRef.current.focus();
        }
        // Optional scroll mode
        const mode = opts?.scroll || 'none';
        if (mode !== 'none') {
          try {
            textareaRef.current.scrollIntoView({ behavior: 'smooth', block: mode });
          } catch {}
        }
      };
      if (opts?.immediate) run();
      else setTimeout(run, 100);
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
  // Refs to track polling timers and component mount status
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const isMountedRef = useRef(true);
  const [overlayComputed, setOverlayComputed] = useState<{ paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number; fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string; } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    setPromptIndex(Math.floor(Math.random() * PROMPTS.length));
  }, []);

  // Cleanup effect to clear all timers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear all pending timeouts
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
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
    // Only auto-focus when explicitly requested by prop
    if (!autoFocus) return;
    const el = textareaRef.current;
    if (!el) return;
    try {
      (el as any).focus?.({ preventScroll: true });
    } catch {
      el.focus();
    }
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

  // Desktop: single-line height; Mobile: slightly taller for ergonomics
  // Use useEffect to listen for window resize events instead of calling matchMedia on every render
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
    // Set initial value
    setIsDesktopViewport(mediaQuery.matches);

    // Modern browsers support addEventListener on MediaQueryList
    if (mediaQuery.addEventListener) {
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDesktopViewport(e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (MediaQueryList type)
      const legacyHandler = (mq: MediaQueryList) => {
        setIsDesktopViewport(mq.matches);
      };
      mediaQuery.addListener(legacyHandler);
      return () => mediaQuery.removeListener(legacyHandler);
    }
  }, []);

  const computedMinHeight = isDesktopViewport ? '52px' : '88px';

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
        const newPostId = `${decodedResult}_v3`;
        
        // Create optimistic post object immediately (even before API call)
        // This ensures the post appears instantly even if backend isn't ready yet
        const optimisticPost: any = {
          id: newPostId,
          content: trimmed,
          sender_address: activeAccount,
          media: mediaUrls,
          total_comments: 0,
          created_at: new Date().toISOString(),
          tx_hash: decodedResult,
          type: 'post_without_tip',
          topics: requiredHashtag ? [requiredHashtag.toLowerCase()] : [],
        };
        
        let created: any = optimisticPost;
        
        try {
          // Try to fetch the actual post from backend, but use optimistic one if it fails
          const fetchedPost = await PostsService.getById({ id: newPostId });
          created = fetchedPost;
        } catch (error) {
          // Backend might not have processed it yet (404), use optimistic post
          if (process.env.NODE_ENV === 'development') {
            console.log('[PostForm] Backend not ready yet, using optimistic post:', error);
          }
          // Continue with optimisticPost
        }
        
        // Optimistically prepend the new post to the latest feed cache so it appears immediately
        // Update all relevant query keys for the latest feed
        const updatedKeys = new Set<string>();
        const updateLatestFeedCache = (queryKey: any[]) => {
          const keyStr = JSON.stringify(queryKey);
          // Skip if we've already updated this key to avoid duplicates
          if (updatedKeys.has(keyStr)) {
            return;
          }
          updatedKeys.add(keyStr);
          
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old || !old.pages || !Array.isArray(old.pages)) {
              return {
                pages: [{ items: [created as any], meta: { currentPage: 1, totalPages: 1 } }],
                pageParams: [1],
              };
            }
            const firstPage = old.pages[0] || { items: [], meta: old.pages[0]?.meta || {} };
            const existingItems = firstPage.items || [];
            // Check if post already exists to prevent duplicates
            const postAlreadyExists = existingItems.some((item: any) => 
              item?.id === created?.id || item?.tx_hash === created?.tx_hash
            );
            if (postAlreadyExists) {
              return old;
            }
            const updatedFirstPage = {
              ...firstPage,
              items: [created as any, ...existingItems],
            };
            return {
              ...old,
              pages: [updatedFirstPage, ...old.pages.slice(1)],
            };
          });
        };
        
        // First, collect all active latest feed queries to avoid duplicate updates
        const activeLatestQueries = queryClient.getQueryCache()
          .findAll({ queryKey: ["posts"], exact: false })
          .filter((query) => {
            const key = query.queryKey as any[];
            return key.length >= 2 && key[1]?.sortBy === "latest";
          })
          .map((query) => query.queryKey as any[]);
        
        // Update all active latest feed queries found in cache
        activeLatestQueries.forEach((key) => {
          updateLatestFeedCache(key);
        });
        
        // Also update the default latest feed query if it wasn't already updated
        // This ensures the query is updated even if it doesn't exist in cache yet
        const defaultKey: any[] = ["posts", { limit: 10, sortBy: "latest", search: "", filterBy: "all" }];
        const defaultKeyStr = JSON.stringify(defaultKey);
        if (!updatedKeys.has(defaultKeyStr)) {
          updateLatestFeedCache(defaultKey);
        }
        
        // Optimistically prepend the new post to the topic feed cache so it appears immediately
        if (requiredHashtag && !requiredMissing) {
          const topicKey = ["topic-by-name", (requiredHashtag || '').toLowerCase()];
          queryClient.setQueryData(topicKey, (old: any) => {
            const prevPosts = Array.isArray(old?.posts) ? old.posts : [];
            // Check if post already exists to prevent duplicates
            const exists = prevPosts.some((p: any) => p?.id === created?.id || p?.tx_hash === created?.tx_hash);
            if (exists) {
              return old;
            }
            return {
              ...(old || {}),
              posts: [created as any, ...prevPosts],
              post_count: typeof old?.post_count === 'number' ? old.post_count + 1 : old?.post_count,
            };
          });
        }
      } else if (postId) {
        // For replies: optimistically show the new reply immediately
        // Normalize postId the same way CommentItem does to ensure cache key matches
        const normalizePostIdV3 = (id: string): string => {
          return String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`;
        };
        const normalizedPostId = normalizePostIdV3(postId);
        const newReplyId = `${String(decodedResult).replace(/_v3$/,'')}_v3`;
        
        // Create optimistic reply object immediately (even before API call)
        // This ensures the reply appears instantly even if backend isn't ready yet
        const optimisticReply: any = {
          id: newReplyId,
          content: trimmed,
          sender_address: activeAccount,
          media: mediaUrls,
          total_comments: 0,
          created_at: new Date().toISOString(),
          tx_hash: decodedResult,
          type: 'post_without_tip',
          topics: [],
        };
        
        let newReply: any = optimisticReply;
        
        try {
          // Try to fetch the actual reply from backend, but use optimistic one if it fails
          const fetchedReply = await PostsService.getById({ id: newReplyId });
          newReply = fetchedReply;
        } catch (error) {
          // Backend might not have processed it yet (404), use optimistic reply
          if (process.env.NODE_ENV === 'development') {
            console.log('[PostForm] Backend not ready yet, using optimistic reply:', error);
          }
          // Continue with optimisticReply
        }
        
        // Helper function to update infinite query format
        // Replies are ordered ASC (oldest first), so new replies go at the bottom (last page)
        const updateInfiniteQuery = (queryKey: any[]) => {
            queryClient.setQueryData(queryKey, (old: any) => {
              if (!old || !old.pages || !Array.isArray(old.pages)) {
                return {
                  pageParams: [1],
                  pages: [{ items: [newReply], meta: { currentPage: 1, totalPages: 1 } }],
                };
              }
              // Check if reply already exists in any page to avoid duplicates
              const exists = old.pages.some((page: any) => 
                page?.items?.some((item: any) => item?.id === newReplyId)
              );
              if (exists) return old;
              
              // Append to the last page (newest items) since replies are ordered ASC
              const lastPageIndex = old.pages.length - 1;
              const lastPage = old.pages[lastPageIndex] || { items: [], meta: {} };
              const updatedLastPage = {
                ...lastPage,
                items: [...(lastPage.items || []), newReply],
              };
              
              return {
                ...old,
                pages: [
                  ...old.pages.slice(0, lastPageIndex),
                  updatedLastPage,
                ],
              };
            });
          };
          
        // Helper function to update array query format
        // Replies are ordered ASC (oldest first), so new replies go at the bottom
        const updateArrayQuery = (queryKey: any[]) => {
            queryClient.setQueryData(queryKey, (old: any) => {
              if (!Array.isArray(old)) return [newReply];
              // Check if reply already exists to avoid duplicates
              const exists = old.some((item: any) => item?.id === newReplyId);
              if (exists) return old;
              // Append to the end (bottom) since replies are ordered ASC
              return [...old, newReply];
            });
          };
          
        // Helper to check if two IDs match (handles both normalized and non-normalized)
        const idsMatch = (id1: string, id2: string): boolean => {
            const normalize = (id: string) => String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`;
            return normalize(id1) === normalize(id2) || id1 === id2;
          };
          
        // CRITICAL: Update ALL active query keys FIRST, using their exact key format
        // This ensures we catch DirectReplies and other components that use the raw ID
        const updatedKeys = new Set<string>();
        const allPostCommentQueries = queryClient.getQueryCache().findAll({ queryKey: ["post-comments"], exact: false });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostForm] Updating replies cache:', {
            postId,
            normalizedPostId,
            newReplyId,
            foundQueries: allPostCommentQueries.length,
            queryKeys: allPostCommentQueries.map(q => q.queryKey),
          });
        }
        
        allPostCommentQueries.forEach((query) => {
          const key = query.queryKey as any[];
          const queryPostId = key[1];
          // Match using normalized comparison
          if (idsMatch(queryPostId, normalizedPostId) || idsMatch(queryPostId, postId)) {
            const keyStr = JSON.stringify(key);
            if (!updatedKeys.has(keyStr)) {
              updatedKeys.add(keyStr);
              if (key[2] === "infinite") {
                updateInfiniteQuery(key);
                if (process.env.NODE_ENV === 'development') {
                  console.log('[PostForm] Updated infinite query:', key);
                }
              } else {
                updateArrayQuery(key);
                if (process.env.NODE_ENV === 'development') {
                  console.log('[PostForm] Updated array query:', key);
                }
              }
            }
          }
        });
        
        // Update ALL active comment-replies query keys
        queryClient.getQueryCache().findAll({ queryKey: ["comment-replies"], exact: false }).forEach((query) => {
          const key = query.queryKey as any[];
          const queryPostId = key[1];
          if (idsMatch(queryPostId, normalizedPostId) || idsMatch(queryPostId, postId)) {
            const keyStr = JSON.stringify(key);
            if (!updatedKeys.has(keyStr)) {
              updatedKeys.add(keyStr);
              updateArrayQuery(key);
            }
          }
        });
        
        // Also explicitly update common key formats as fallback (even if query doesn't exist yet)
        // This ensures the reply appears immediately when the component mounts
        const fallbackKeys = [
          ["post-comments", normalizedPostId, "infinite"],
          ["post-comments", normalizedPostId],
          ["comment-replies", normalizedPostId],
          ["post-comments", postId, "infinite"],
          ["post-comments", postId],
          ["comment-replies", postId],
        ];
        
        fallbackKeys.forEach((key) => {
          const keyStr = JSON.stringify(key);
          if (!updatedKeys.has(keyStr)) {
            updatedKeys.add(keyStr);
            if (key[2] === "infinite") {
              updateInfiniteQuery(key);
            } else {
              updateArrayQuery(key);
            }
          }
        });
        
        // Optimistically update parent post's comment count
        // Update parent post in cache if it exists (for both normalized and original formats)
        // Helper to normalize IDs consistently
        const normalizeId = (id: string): string => {
          return String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`;
        };
        
        // Normalize parent ID once to use consistently (both normalizedPostId and postId should normalize to the same value)
        const normalizedParentId = normalizeId(normalizedPostId);
        
        // Helper to check if an ID matches the parent (handles both normalized and non-normalized)
        const matchesParentId = (id: string | undefined): boolean => {
          if (!id) return false;
          return normalizeId(id) === normalizedParentId;
        };
        
        const updateParentPostCommentCount = () => {
          // Update all post queries that might contain the parent post
          queryClient.getQueryCache().findAll({ queryKey: ["posts"], exact: false }).forEach((query) => {
            const key = query.queryKey as any[];
            queryClient.setQueryData(key, (old: any) => {
              if (!old || !old.pages) return old;
              return {
                ...old,
                pages: old.pages.map((p: any) => ({
                  ...p,
                  items: p.items?.map((i: any) => 
                    matchesParentId(i?.id)
                      ? { ...i, total_comments: (i.total_comments || 0) + 1 }
                      : i
                  ) || [],
                })),
              };
            });
          });
          
          // Also check single post queries for both formats
          queryClient.setQueryData(["post", normalizedPostId], (old: any) => {
            if (old && matchesParentId(old.id)) {
              return { ...old, total_comments: (old.total_comments || 0) + 1 };
            }
            return old;
          });
          
          // Only update postId query if it's different from normalizedPostId (as strings)
          // Compare original strings, not normalized versions, since normalization is idempotent
          if (postId !== normalizedPostId) {
            queryClient.setQueryData(["post", postId], (old: any) => {
              if (old && matchesParentId(old.id)) {
                return { ...old, total_comments: (old.total_comments || 0) + 1 };
              }
              return old;
            });
          }
        };
        
        // Update parent post comment count optimistically (only once to avoid double increment)
        updateParentPostCommentCount();
        
        // Invalidate descendant count queries so they refetch with the new reply
        queryClient.invalidateQueries({ queryKey: ["post-desc-count"], exact: false });
        
        // Poll backend until comment is confirmed or max retries reached
        // Backend needs time to process blockchain transaction and update database
        const maxRetries = 18; // Try for up to ~59 seconds (5s initial + 18 retries * 3 seconds)
        const retryInterval = 3000; // 3 seconds between retries
        
        const pollForComment = (attempt: number = 0) => {
          // Stop polling if component is unmounted
          if (!isMountedRef.current) {
            return;
          }
          
          if (attempt >= maxRetries) {
            // Final attempt after max retries
            if (isMountedRef.current) {
              queryClient.invalidateQueries({ queryKey: ["post-comments", normalizedPostId] });
              queryClient.invalidateQueries({ queryKey: ["comment-replies", normalizedPostId] });
              queryClient.refetchQueries({ 
                queryKey: ["post-comments", normalizedPostId],
                type: 'active',
              });
              queryClient.refetchQueries({ 
                queryKey: ["comment-replies", normalizedPostId],
                type: 'active',
              });
            }
            return;
          }
          
          const timeoutId = setTimeout(() => {
            // Remove timeout ID from tracking set
            timeoutRefs.current.delete(timeoutId);
            
            // Stop if component unmounted
            if (!isMountedRef.current) {
              return;
            }
            
            queryClient.invalidateQueries({ queryKey: ["post-comments", normalizedPostId] });
            queryClient.invalidateQueries({ queryKey: ["comment-replies", normalizedPostId] });
            Promise.all([
              queryClient.refetchQueries({ 
                queryKey: ["post-comments", normalizedPostId],
                type: 'active',
              }),
              queryClient.refetchQueries({ 
                queryKey: ["comment-replies", normalizedPostId],
                type: 'active',
              })
            ]).then(() => {
              // Stop if component unmounted
              if (!isMountedRef.current) {
                return;
              }
              
              // Check if backend has processed the comment by verifying it exists in the refetched list
              const cachedComments = queryClient.getQueryData<any[]>(["comment-replies", normalizedPostId]);
              const commentExists = cachedComments?.some((c: any) => c?.id === newReplyId);
              
              // If comment exists in backend response, we're done
              // Otherwise, keep polling
              if (commentExists) {
                return;
              }
              
              // Continue polling
              pollForComment(attempt + 1);
            }).catch(() => {
              // Stop if component unmounted
              if (!isMountedRef.current) {
                return;
              }
              
              // On error, continue polling
              pollForComment(attempt + 1);
            });
          }, retryInterval);
          
          // Track timeout ID for cleanup
          timeoutRefs.current.add(timeoutId);
        };
        
        // Start polling after initial delay to give backend time to start processing
        const initialTimeoutId = setTimeout(() => {
          // Remove timeout ID from tracking set
          timeoutRefs.current.delete(initialTimeoutId);
          
          // Only start polling if component is still mounted
          if (isMountedRef.current) {
            pollForComment(0);
          }
        }, 5000); // 5 second initial delay before first poll
        
        // Track initial timeout ID for cleanup
        timeoutRefs.current.add(initialTimeoutId);
        
        onCommentAdded?.();
      }

      // Reset after success
      setText(initialText || "");
      setMediaUrls([]);
      
      // Call onPostCreated callback if this is a new post (for tab switching, etc.)
      if (isPost) {
        onPostCreated?.();
      }
      
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
      : t('connectWalletToPost');
  } else {
    currentPlaceholder = activeAccount
      ? t('writeReply')
      : t('connectWalletToReply');
  }

  // If not connected and it's a reply, show simple message
  if (!activeAccount && !isPost) {
    return (
      <div
        className={`mx-auto mb-5 md:mb-4 ${className}`}
      >
        <div className="bg-transparent border-none p-0 rounded-xl transition-all duration-300 relative shadow-none md:bg-gradient-to-br md:from-white/8 md:to-white/3 md:border md:border-white/10 md:outline md:outline-1 md:outline-white/10 md:rounded-2xl md:p-4 md:backdrop-blur-xl">
          <div className="text-center text-white/70">
            <p className="text-sm">{t('pleaseConnectWalletToReply')}</p>
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
                  className="bg-white/7 border border-white/14 rounded-xl md:rounded-2xl pt-1.5 pr-2.5 pl-2.5 pb-9 text-white text-base transition-all duration-200 outline-none caret-[#1161FE] resize-none leading-snug md:leading-relaxed w-full box-border placeholder-white/60 font-medium focus:border-[#1161FE] focus:bg-white/10 focus:shadow-[0_0_0_2px_rgba(17,97,254,0.5),0_8px_24px_rgba(0,0,0,0.25)] md:p-4 md:pr-14 md:pb-8 md:text-base"
                  style={{ minHeight: computedMinHeight }}
                  rows={1}
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
                      title={tSocial('gif')}
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
                      <span className="uppercase tracking-wide">{tSocial('gif')}</span>
                    </button>
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
                        title={tSocial('emoji')}
                        ref={emojiBtnRef}
                        onClick={() => {
                          setShowEmoji((s) => !s);
                          setShowGif(false);
                        }}
                      >
                        <IconSmile className="w-4 h-4" />
                        <span>{tSocial('emoji')}</span>
                      </button>
                    )}

                    {showGifInput && (
                      <button
                        type="button"
                        className="bg-white/5 border border-white/10 text-white/70 px-3 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,255,157,0.2)] active:translate-y-0 md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm"
                        title={tSocial('gif')}
                        ref={gifBtnRef}
                        onClick={() => {
                          setShowGif((s) => !s);
                          setShowEmoji(false);
                        }}
                      >
                        <IconGif className="w-4 h-4" />
                        <span>{tSocial('gif')}</span>
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
                          {tSocial('moreSoon')}
                        </div>
                      </div>
                    )}

                    {showGifInput && (
                      <GifSelectorDialog
                        open={showGif}
                        onOpenChange={setShowGif}
                        mediaUrls={mediaUrls}
                        onMediaUrlsChange={setMediaUrls}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {requiredHashtag && requiredMissing && (
                      <div className="flex items-center gap-2 text-[11px] text-white/70">
                        <span>{tSocial('postNeedsToInclude', { hashtag: (requiredHashtag || '').toUpperCase() })}</span>
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
                            title={tSocial('addRequiredHashtag')}
                        >
                          {tSocial('add')}
                        </button>
                      </div>
                    )}
                    {activeAccount ? (
                      <AeButton
                        type="submit"
                        loading={isSubmitting}
                        disabled={!text.trim() || (requiredHashtag ? requiredMissing : false)}
                        className="relative bg-[#1161FE] border-none text-white font-black px-6 py-3 rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none md:min-h-[44px] md:text-base"
                      >
                        {isSubmitting
                          ? isPost
                            ? tSocial('posting')
                            : tSocial('posting')
                          : isPost
                            ? tSocial('post')
                            : tSocial('postReply')}
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
                <span>{tSocial('postNeedsToInclude', { hashtag: (requiredHashtag || '').toUpperCase() })}</span>
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
                  title={tSocial('addRequiredHashtag')}
                >
                  {tSocial('add')}
                </button>
              </div>
            )}
              {activeAccount ? (
                <AeButton
                  type="submit"
                  loading={isSubmitting}
                  disabled={!text.trim() || (requiredHashtag ? requiredMissing : false)}
                  className="relative bg-[#1161FE] border-none text-white font-black px-5 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none w-full md:w-auto md:px-6 md:py-3 md:min-h-[44px] md:text-base"
                >
                  {isSubmitting
                    ? isPost
                      ? tSocial('posting')
                      : tSocial('posting')
                    : isPost
                      ? tSocial('post')
                      : tSocial('postReply')}
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
