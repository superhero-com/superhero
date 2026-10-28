import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { type ContractMethodsBase } from '@aeternity/aepp-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import React, {
  forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import TIPPING_V3_ACI from 'tipping-contract/generated/Tipping_v3.aci.json';
import { TxPayloadType, useTransactionNotification } from '@/features/transaction-notification';
import { MAX_POST_IMAGES, POST_IMAGE_ACCEPT } from '../utils/postImages';
import { usePostImages } from '../hooks/usePostImages';
import '@/components/layout/RailCards.css';
import './PostComposer.css';

import AeButton from '../../../components/AeButton';
import { ConnectWalletButton } from '../../../components/ConnectWalletButton';
import { IconClose, IconLink } from '../../../icons';
// @ts-ignore
import { PostsService } from '../../../api/generated';
import { CONFIG } from '../../../config';
import { useAccount } from '../../../hooks/useAccount';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useHashtagAllowedChars } from '../../../hooks/useCommunityFactory';
import { initializeContractTyped } from '../../../libs/initializeContractTyped';
import { DetectedLinkPreview } from './DetectedLinkPreview';
import TokenTagOptionsBar from './TokenTagOptionsBar';
import { MentionSuggestionList } from './MentionSuggestionList';
import { useLinkDetection } from '../hooks/useLinkDetection';
import {
  insertPostIntoFeeds,
  insertReplyIntoThreads,
  normalizePostId,
  trackPublishedPost,
  trackPublishedReply,
} from '../utils/pendingPosts';
import { useMentionSearch, type MentionItem } from '../hooks/useMentionSearch';
import {
  detectActiveMention,
  buildAccountMentionToken,
  buildAccountMentionDisplay,
  buildTokenMentionToken,
  applyMention,
  serializeMentions,
  segmentMentions,
  clampMentionInput,
  type AppliedMention,
} from '../utils/mentions';

type TippingV3ContractApi = ContractMethodsBase & {
  post_without_tip: (
    content: string,
    media: string[],
  // `hash`: the call's transaction, once mined (the SDK waits for it).
  ) => Promise<{ decodedResult: string; hash?: string }>;
};

interface PostFormProps {
  // Common props
  onSuccess?: (postId?: string) => void;
  className?: string;
  appearance?: 'default' | 'integrated';
  compactMobile?: boolean;
  onTextChange?: (text: string) => void;

  // Post-specific props
  isPost?: boolean;
  // Callback when a new post is created (for tab switching, etc.)
  onPostCreated?: (postId?: string) => void;

  // Comment-specific props
  postId?: string;
  onCommentAdded?: () => void;
  placeholder?: string;

  // Topic enforcement
  initialText?: string; // prefilled content (e.g., "#nancy ")
  requiredHashtag?: string; // canonical, lowercase content hashtag (e.g., "#nancy")

  // Feature toggles
  showMediaFeatures?: boolean;
  characterLimit?: number;
  autoFocus?: boolean;
}

const PROMPTS: string[] = [
  "Drop alpha: what's cooking on æ today? 🚀",
  'Spill the tea ☕️ — wins, fails, spicy takes?',
  'GM makers. What are you shipping? 🧪',
  'Show & tell: graphs, code, memes 📈',
  'One hot take about æternity… go. 🔥',
  "Who should we vibe‑check? Tag 'em 👀",
  "What's your builder ritual today? 🛠️",
  "If it compiles, it ships. What's next? ⚙️",
  'Less talk, more blocks. What did you deploy? ⛓️',
  'Teach us something in 1 line. 🧠',
];

const PostForm = forwardRef<{ focus:(opts?: { immediate?: boolean; preventScroll?: boolean; scroll?: 'none' | 'start' | 'center' }) => void }, PostFormProps>((props, ref) => {
  const { t } = useTranslation();
  const tf = (key: string, options?: Record<string, unknown>) => t(`forms.${key}`, options);
  const ts = (key: string, options?: Record<string, unknown>) => t(`social.${key}`, options);
  const {
    onSuccess,
    className = '',
    appearance = 'default',
    compactMobile = false,
    onTextChange,
    isPost = true,
    postId,
    onCommentAdded,
    onPostCreated,
    placeholder,
    initialText,
    requiredHashtag,
    showMediaFeatures = true,
    characterLimit = 280,
    autoFocus = false,
  } = props;
  const usesComposerSurface = isPost || appearance === 'integrated';
  const { sdk } = useAeSdk();
  const { activeAccount } = useAccount();
  const queryClient = useQueryClient();
  const { notifySubmitted, notifyConfirmed, notifyError } = useTransactionNotification();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: (opts?: { immediate?: boolean; preventScroll?: boolean; scroll?: 'none' | 'start' | 'center' }) => {
      const run = () => {
        if (!textareaRef.current) return;
        try {
          // Optionally prevent browser auto-scroll on focus
          const ps = opts?.preventScroll ?? true;
          (textareaRef.current as any).focus?.({ preventScroll: ps });
        } catch {
          // Ignore focus errors
          textareaRef.current.focus();
        }
        // Optional scroll mode
        const mode = opts?.scroll || 'none';
        if (mode !== 'none') {
          try {
            textareaRef.current.scrollIntoView({ behavior: 'smooth', block: mode });
          } catch {
            // Ignore scroll errors
          }
        }
      };
      if (opts?.immediate) run();
      else setTimeout(run, 100);
    },
  }));

  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postImages = usePostImages();
  const imageInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const accountRef = useRef(activeAccount);
  accountRef.current = activeAccount;
  const hasContent = Boolean(text.trim() || postImages.images.length);
  const mediaFull = postImages.images.length >= MAX_POST_IMAGES;
  const [promptIndex, setPromptIndex] = useState(0);
  const [dismissedLinkUrl, setDismissedLinkUrl] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  // Display→storage split for tagged mentions: the textarea holds the short display
  // run, and these carry the `[account:{address}]` form each serialises to on submit.
  const [mentions, setMentions] = useState<AppliedMention[]>([]);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  const detectedLink = useLinkDetection(text);
  const linkPreviewDismissedForCurrent = Boolean(
    detectedLink && dismissedLinkUrl === detectedLink.url,
  );
  const showLinkPreview = Boolean(
    detectedLink && !linkPreviewDismissedForCurrent,
  );

  const [overlayComputed, setOverlayComputed] = useState<{
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
  } | null>(null);
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

  // Do not auto-fill from initialText anymore; keep user input empty by default

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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

  // Desktop: single-line height; Mobile: slightly taller for ergonomics
  // Use useEffect to listen for window resize events instead of calling matchMedia on every render
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => { };
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
    }
    // Fallback for older browsers (MediaQueryList type)
    const legacyHandler = (mq: MediaQueryList) => {
      setIsDesktopViewport(mq.matches);
    };
    // @ts-ignore
    mediaQuery.addListener(legacyHandler);
    // @ts-ignore
    return () => mediaQuery.removeListener(legacyHandler);
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
    requiredHashtag
    && requiredMissing
    && activeHashtagMatch
    && matchesRequiredPrefix
    && remainingSuggestion.length > 0,
  );

  // Inline mentions: detect an in-progress `@account` / `#token` at the caret,
  // fetch suggestions, and let the user pick one to insert into the content.
  const activeMention = useMemo(
    () => detectActiveMention(text, caretPosition),
    [text, caretPosition],
  );
  const mentionKey = activeMention ? `${activeMention.trigger}:${activeMention.start}` : null;
  // Reset dismissal + highlight whenever the caret moves to a different mention token.
  useEffect(() => {
    setMentionDismissed(false);
    setMentionIndex(0);
  }, [mentionKey]);

  const hashtagAllowedChars = useHashtagAllowedChars();
  const { items: mentionItems } = useMentionSearch(
    mentionDismissed ? null : activeMention,
    hashtagAllowedChars,
  );
  // Defer to the required-hashtag ghost text when it is active to avoid two overlays.
  const showMentionMenu = Boolean(activeMention)
    && !mentionDismissed
    && !showAutoComplete
    && mentionItems.length > 0;
  const boundedMentionIndex = Math.min(mentionIndex, Math.max(mentionItems.length - 1, 0));

  // What actually goes on the wire — display runs expanded to their `[account:…]` form.
  // Drives both the submit content and the character counter (the macro is what counts).
  const serializedText = useMemo(() => serializeMentions(text, mentions), [text, mentions]);
  // The one accept-path into the composer buffer: every proposed string — the textarea's own
  // edits and the token-tag chip bar's rung changes — goes through here, so the serialised cap
  // is enforced in exactly one place. clampMentionInput trims an over-cap insert to the room
  // left, counting the serialised macro rather than the shorter display run.
  const acceptComposerText = (next: string) => setText(
    characterLimit
      ? clampMentionInput(text, next, mentions, characterLimit, hashtagAllowedChars)
      : next,
  );
  // Segments for the overlay mirror: identical glyph runs, mention runs flagged for pills.
  const mentionSegments = useMemo(() => segmentMentions(text, mentions), [text, mentions]);
  // Only mirror when there is a pill to draw. With no tagged run the mirror is a
  // pixel-for-pixel no-op, so keeping the textarea's own text avoids taking on any
  // metric-fidelity (or stale-padding-on-resize) risk for the common untagged post.
  const hasPilledMention = mentionSegments.some((seg) => seg.mention !== null);
  const showMirror = Boolean(overlayComputed) && hasPilledMention;

  const handleSelectMention = (item: MentionItem) => {
    if (!activeMention) return;
    // The textarea gets the short display run; the map remembers what it serialises to.
    const applied: AppliedMention = item.type === 'account'
      ? {
        trigger: 'account',
        display: buildAccountMentionDisplay({ address: item.address, chainName: item.chainName }),
        serialized: buildAccountMentionToken({ address: item.address }),
      }
      : (() => {
        const token = buildTokenMentionToken({ name: item.name, symbol: item.symbol });
        return { trigger: 'token' as const, display: token, serialized: token };
      })();
    const { text: nextText, caret } = applyMention(text, activeMention, applied.display);
    const dup = mentions.some((m) => m.display === applied.display
      && m.serialized === applied.serialized);
    const nextMentions = dup ? mentions : [...mentions, applied];
    // The picker set text directly, skipping the clamp the typing/paste paths use — so a
    // pick could push the serialised macro past the cap. A picked mention is atomic:
    // route it through the same clamp and reject the pick if the whole run won't fit.
    const clamped = characterLimit
      ? clampMentionInput(text, nextText, nextMentions, characterLimit)
      : nextText;
    if (clamped !== nextText) return;
    setText(nextText);
    setMentions(nextMentions);
    setMentionDismissed(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Do not auto-append the required hashtag; the Post button is disabled until present
    const trimmed = text.trim();
    if ((!trimmed && !postImages.images.length) || submitting.current) return;
    if (!activeAccount) return;
    // Expand display runs to their `[account:{address}]` storage form for the wire.
    const serialized = serializeMentions(text, mentions).trim();

    submitting.current = true;
    const author = activeAccount;
    setIsSubmitting(true);

    const txPayload = isPost
      ? { type: TxPayloadType.CreatePost, content: serialized } as const
      : { type: TxPayloadType.CreateComment, postId: postId! } as const;

    try {
      const imageUrls = await postImages.prepare();
      if (accountRef.current !== author) throw new Error('Your wallet changed. Please try again.');
      const attachedMedia = imageUrls;
      if (attachedMedia.length > MAX_POST_IMAGES) throw new Error('Attach up to four images per post.');
      const contract = await initializeContractTyped<TippingV3ContractApi>(
        sdk,
        { aci: TIPPING_V3_ACI as any, address: CONFIG.CONTRACT_V3_ADDRESS },
      );

      let postMedia: string[] = [];

      if (isPost) {
        // For posts, include media URLs
        postMedia = attachedMedia;
      } else if (postId) {
        postMedia = [`comment:${postId}`, ...attachedMedia];
      }

      if (accountRef.current !== author) throw new Error('Your wallet changed. Please try again.');
      notifySubmitted(txPayload);
      const { decodedResult, hash } = await contract.post_without_tip(
        serialized,
        postMedia,
      );

      notifyConfirmed(txPayload);

      let newPostId: string;
      if (isPost) {
        newPostId = `${decodedResult}_v3`;
        const topic = requiredHashtag && !requiredMissing ? requiredHashtag.toLowerCase() : null;

        // Built here so the post shows at once; the backend indexes it later.
        const optimisticPost: any = {
          id: newPostId,
          content: serialized,
          sender_address: author,
          media: attachedMedia,
          total_comments: 0,
          created_at: new Date().toISOString(),
          tx_hash: hash ?? decodedResult,
          type: 'post_without_tip',
          topics: requiredHashtag ? [requiredHashtag.toLowerCase()] : [],
        };

        let created: any = optimisticPost;
        try {
          // The backend's copy, if it already has it.
          created = await PostsService.getById({ id: newPostId });
        } catch {
          // Not indexed yet (404): keep the one built here, and keep it
          // across reloads until the backend has it. The pending-transactions
          // store refreshes the feeds then.
          if (hash) {
            trackPublishedPost({
              account: author, txHash: hash, post: optimisticPost, topic,
            });
          }
        }

        insertPostIntoFeeds(queryClient, created, topic);
      } else if (postId) {
        const normalizedPostId = normalizePostId(postId);
        const newReplyId = `${String(decodedResult).replace(/_v3$/, '')}_v3`;

        // Built here so the reply shows at once; the backend indexes it later.
        const optimisticReply: any = {
          id: newReplyId,
          content: serialized,
          sender_address: author,
          media: attachedMedia,
          total_comments: 0,
          created_at: new Date().toISOString(),
          tx_hash: hash ?? decodedResult,
          type: 'post_without_tip',
          topics: [],
        };

        let newReply: any = optimisticReply;
        try {
          newReply = await PostsService.getById({ id: newReplyId });
        } catch {
          // Not indexed yet: keep the one built here until the backend has it.
          if (hash) {
            trackPublishedReply({
              account: author, txHash: hash, parentId: postId, reply: optimisticReply,
            });
          }
        }

        insertReplyIntoThreads(queryClient, postId, newReply);

        // One more reply on the parent, wherever it is shown.
        const isParent = (id: string | undefined): boolean => (
          Boolean(id) && normalizePostId(id!) === normalizedPostId
        );
        queryClient.getQueryCache().findAll({ queryKey: ['posts'], exact: false }).forEach((query) => {
          queryClient.setQueryData(query.queryKey, (old: any) => {
            if (!old || !old.pages) return old;
            return {
              ...old,
              pages: old.pages.map((p: any) => ({
                ...p,
                items: p.items?.map((i: any) => (isParent(i?.id)
                  ? { ...i, total_comments: (i.total_comments || 0) + 1 }
                  : i)) || [],
              })),
            };
          });
        });
        const bumpParent = (old: any) => (old && isParent(old.id)
          ? { ...old, total_comments: (old.total_comments || 0) + 1 }
          : old);
        queryClient.setQueryData(['post', normalizedPostId], bumpParent);
        if (postId !== normalizedPostId) queryClient.setQueryData(['post', postId], bumpParent);

        // Descendant counts refetch with the new reply.
        queryClient.invalidateQueries({ queryKey: ['post-desc-count'], exact: false });

        onCommentAdded?.();
      }

      // Reset after success
      setText(initialText || '');
      postImages.reset();
      setMentions([]);
      setDismissedLinkUrl(null);

      // Call onPostCreated callback if this is a new post (for tab switching, etc.)
      if (isPost) {
        onPostCreated?.(newPostId ?? postId);
      }

      onSuccess?.(newPostId ?? postId);
      // Also refetch any topic feeds related to this hashtag so other viewers update quickly
      try {
        if (requiredHashtag) {
          queryClient.invalidateQueries({ queryKey: ['topic-by-name'] });
        }
      } catch {
        // Ignore topic refresh errors
      }
    } catch (error: any) {
      // TODO: add sentry capture
      notifyError(error?.message || (isPost ? ts('failedToPublishPost') : ts('failedToPublishReply')));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  // Dynamic placeholder logic
  let currentPlaceholder: string;
  if (placeholder) {
    currentPlaceholder = placeholder;
  } else if (isPost) {
    currentPlaceholder = activeAccount
      ? PROMPTS[promptIndex]
      : tf('connectWalletToPost');
  } else {
    currentPlaceholder = activeAccount
      ? tf('writeReply')
      : tf('connectWalletToReply');
  }

  const hasMediaTools = showMediaFeatures || Boolean(detectedLink);
  const replyMinHeight = appearance === 'integrated' ? '132px' : computedMinHeight;

  const imageButton = (variant: 'desktop' | 'mobile' | 'tile' = 'desktop') => (
    <button
      type="button"
      aria-label={ts('images.add')}
      title={ts('images.add')}
      disabled={isSubmitting || mediaFull || !activeAccount}
      onClick={() => imageInput.current?.click()}
      className={{
        desktop: 'post-composer__tool inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:text-primary-400 disabled:opacity-40',
        mobile: 'inline-flex items-center justify-center gap-1 px-2 min-h-8 rounded-md border border-white/10 text-white/80 text-xs disabled:opacity-40',
        tile: 'flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/30 bg-white/[0.02] text-xs text-white/70 hover:border-primary-400 hover:bg-white/5 hover:text-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 disabled:opacity-40',
      }[variant]}
    >
      <ImagePlus className="h-4 w-4" aria-hidden />
      <span>{ts('images.photos')}</span>
    </button>
  );

  const desktopTools = (
    <div className="post-composer__tools flex items-center gap-2.5 relative">
      {showMediaFeatures && postImages.images.length === 0 && imageButton()}
      {detectedLink && (
        <button
          type="button"
          className={`post-composer__tool border text-white/70 px-3 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-semibold md:px-4 md:py-2.5 md:min-h-[44px] md:text-sm ${
            linkPreviewDismissedForCurrent
              ? 'bg-primary-100 border-primary-300 text-primary-600'
              : 'bg-white/5 border-white/10 hover:bg-primary-100 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,255,157,0.2)] active:translate-y-0'
          }`}
          title={linkPreviewDismissedForCurrent ? ts('restoreLinkPreview') : ts('dismissLinkPreview')}
          onClick={() => {
            if (linkPreviewDismissedForCurrent) {
              setDismissedLinkUrl(null);
            } else {
              setDismissedLinkUrl(detectedLink.url);
            }
          }}
        >
          {usesComposerSurface ? (
            <span className="post-composer__tool-icon post-composer__tool-icon--link" aria-hidden="true">
              <IconLink className="w-4 h-4" />
            </span>
          ) : <IconLink className="w-4 h-4" />}
          <span>{ts('link')}</span>
        </button>
      )}

    </div>
  );

  const mobileSubmit = (
    <div className="post-composer__mobile-submit flex items-center justify-center w-full pt-0 -mt-3 md:hidden">
      <div className="flex flex-col items-center justify-center w-full">
        {requiredHashtag && requiredMissing && (
          <div className="w-full mb-2 flex items-center justify-center gap-2 text-[12px] text-white/70">
            <span>{ts('postNeedsToInclude', { hashtag: (requiredHashtag || '').toUpperCase() })}</span>
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
              title={ts('addRequiredHashtag')}
            >
              {ts('add')}
            </button>
          </div>
        )}
        {activeAccount ? (
          <AeButton
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || !hasContent || (requiredHashtag ? requiredMissing : false)}
            className="post-composer__primary relative bg-[#1161FE] border-none text-white font-black px-5 py-2 rounded-xl md:rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none w-full md:w-auto md:px-6 md:py-3 md:min-h-[44px] md:text-base"
          >
            {(() => {
              if (isSubmitting) {
                return ts('posting');
              }
              if (isPost) {
                return ts('post');
              }
              return ts('postReply');
            })()}
          </AeButton>
        ) : (
          <ConnectWalletButton block className="post-composer__primary post-composer__connect w-full rounded-xl md:rounded-full" />
        )}
      </div>
    </div>
  );

  // If not connected and it's a reply, show simple message
  if (!activeAccount && !isPost && appearance === 'integrated') {
    return (
      <div className="post-composer reply-connect">
        <div>
          <strong>{ts('postDetail.join')}</strong>
          <p>{tf('pleaseConnectWalletToReply')}</p>
        </div>
        <ConnectWalletButton className="post-composer__primary" />
      </div>
    );
  }
  if (!activeAccount && !isPost) {
    return (
      <div
        className={`mx-auto mb-5 md:mb-4 ${className}`}
      >
        <div className="bg-transparent border-none p-0 rounded-xl transition-all duration-300 relative shadow-none md:bg-gradient-to-br md:from-white/8 md:to-white/3 md:border md:border-white/10 md:outline md:outline-1 md:outline-white/10 md:rounded-2xl md:p-4 md:backdrop-blur-xl">
          <div className="text-center text-white/70">
            <p className="text-sm">{tf('pleaseConnectWalletToReply')}</p>
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
      className={`${usesComposerSurface ? 'post-composer w-full max-w-none' : 'mx-auto'} ${compactMobile ? 'post-composer--compact-mobile' : ''} mb-2 md:mb-4 ${className}`}
    >
      <div className={usesComposerSurface ? 'rail-card post-composer__surface' : 'bg-transparent border-none p-0 rounded-xl transition-all duration-300 relative shadow-none md:bg-gradient-to-br md:from-white/8 md:to-white/3 md:border md:border-white/10 md:outline md:outline-1 md:outline-white/10 md:rounded-2xl md:p-4 md:backdrop-blur-xl'}>
        <form onSubmit={handleSubmit} className="relative">
          <fieldset disabled={isSubmitting} className="contents">
            {showMediaFeatures && (
            <input
              ref={imageInput}
              type="file"
              accept={POST_IMAGE_ACCEPT}
              multiple
              hidden
              aria-label={ts('images.choose')}
              onChange={(event) => { const input = event.target; postImages.select(Array.from(input.files || [])); input.value = ''; }}
            />
            )}
            <div className="flex flex-col gap-3 md:grid md:grid-cols-[56px_1fr] md:gap-x-0 md:gap-y-3">
              {activeAccount && (
              <div className="hidden md:block">
                <AddressAvatarWithChainName
                  address={activeAccount}
                  size={40}
                  isHoverEnabled
                  showAddressAndChainName={false}
                />
              </div>
              )}
              <div className={activeAccount ? 'md:col-start-2' : 'md:col-span-2'}>
                <div ref={inputWrapRef} className="post-composer__input-wrap relative bg-white/7 border border-white/14 rounded-xl md:rounded-2xl transition-all duration-200 focus-within:border-[#1161FE] focus-within:bg-white/10 focus-within:shadow-[0_0_0_2px_rgba(17,97,254,0.5),0_8px_24px_rgba(0,0,0,0.25)]">
                  {/* Overlay mirror: same glyph runs as the textarea, mention runs pilled.
                    Sits behind the transparent-text textarea so caret/selection stay on top;
                    no horizontal padding on pills, so widths — and the caret — stay exact. */}
                  {showMirror && overlayComputed && (
                  <div
                    aria-hidden
                    className="post-composer__mirror absolute inset-0 overflow-hidden pointer-events-none select-none text-white whitespace-pre-wrap break-words box-border"
                    style={{
                      zIndex: 0,
                      paddingTop: overlayComputed.paddingTop,
                      paddingRight: overlayComputed.paddingRight,
                      paddingBottom: overlayComputed.paddingBottom,
                      paddingLeft: overlayComputed.paddingLeft,
                      fontFamily: overlayComputed.fontFamily,
                      fontSize: overlayComputed.fontSize,
                      fontWeight: overlayComputed.fontWeight,
                      lineHeight: overlayComputed.lineHeight,
                      letterSpacing: overlayComputed.letterSpacing,
                    }}
                  >
                    {mentionSegments.map((seg, i) => (seg.mention ? (
                      <span
                        // eslint-disable-next-line react/no-array-index-key
                        key={`m-${i}`}
                        className={`rounded bg-white/10 ${seg.mention.trigger === 'account' ? 'text-[var(--neon-teal)]' : 'text-[var(--neon-blue)]'}`}
                        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' }}
                      >
                        {seg.text}
                      </span>
                    ) : (
                      // eslint-disable-next-line react/no-array-index-key
                      <span key={`t-${i}`}>{seg.text}</span>
                    )))}
                  </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    disabled={isSubmitting}
                    onPaste={(event) => {
                      const files = Array.from(event.clipboardData.files);
                      if (showMediaFeatures && files.length && !isSubmitting) {
                        event.preventDefault(); postImages.select(files);
                      }
                    }}
                    placeholder={currentPlaceholder}
                    aria-label={isPost ? ts('post') : tf('writeReply')}
                    value={text}
                    onChange={(e) => acceptComposerText(e.target.value)}
                    onFocus={() => {
                      if (requiredHashtag && !text) {
                        const tag = `${requiredHashtag.toUpperCase()} `;
                        setText(tag);
                        requestAnimationFrame(() => {
                          const el = textareaRef.current;
                          if (el) el.setSelectionRange(tag.length, tag.length);
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                    // Mention picker navigation takes priority while it is open.
                      if (showMentionMenu) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setMentionIndex((i) => (i + 1) % mentionItems.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setMentionIndex((i) => (i - 1 + mentionItems.length) % mentionItems.length);
                          return;
                        }
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          handleSelectMention(mentionItems[boundedMentionIndex]);
                          return;
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setMentionDismissed(true);
                          return;
                        }
                      }
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
                          const pos = (`${before + fullUpper} `).length;
                          if (el) {
                            el.focus();
                            el.setSelectionRange(pos, pos);
                          }
                        });
                      }
                    }}
                    className="post-composer__textarea bg-transparent border-none outline-none pt-1.5 pr-2.5 pl-2.5 pb-9 text-white text-base resize-none leading-snug md:leading-relaxed w-full box-border placeholder-white/60 font-medium md:p-4 md:pr-14 md:pb-8 md:text-base focus:!shadow-none focus:!translate-y-0 focus:!bg-transparent caret-[#1161FE]"
                    style={{
                      minHeight: isPost ? 'var(--composer-min-height, 160px)' : replyMinHeight,
                      // Text goes transparent so the mirror below shows the pills; caret
                      // (caret-color) and selection stay painted by the textarea on top.
                      ...(showMirror ? { color: 'transparent', position: 'relative', zIndex: 1 } : null),
                    }}
                    rows={1}
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

                  {showMentionMenu && (
                  <MentionSuggestionList
                    items={mentionItems}
                    activeIndex={boundedMentionIndex}
                    onHover={setMentionIndex}
                    onSelect={handleSelectMention}
                    anchorEl={inputWrapRef.current}
                  />
                  )}

                  <div className={usesComposerSurface ? 'post-composer__input-footer' : undefined}>
                    {usesComposerSurface && hasMediaTools && <div className="hidden md:block min-w-0">{desktopTools}</div>}
                    <div className="post-composer__mobile-tools md:hidden absolute bottom-5 left-2 flex items-center gap-1.5">
                      {showMediaFeatures && postImages.images.length === 0 && imageButton('mobile')}
                      {/* Mobile-only Link preview toggle */}
                      {detectedLink && (
                      <button
                        type="button"
                        className={`md:hidden inline-flex items-center h-5 px-2 rounded-[calc(var(--radius)-2px)] border outline outline-1 text-[11px] leading-none transition-colors min-h-0 min-w-0 z-20 touch-manipulation gap-1 ${
                          linkPreviewDismissedForCurrent
                            ? 'bg-primary-100/20 border-primary-400/50 outline-primary-400/50 text-primary-400'
                            : 'bg-transparent border-white/10 outline-white/10 text-white/80 hover:border-white/20'
                        }`}
                        title={linkPreviewDismissedForCurrent ? ts('restoreLinkPreview') : ts('dismissLinkPreview')}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (linkPreviewDismissedForCurrent) {
                            setDismissedLinkUrl(null);
                          } else {
                            setDismissedLinkUrl(detectedLink.url);
                          }
                        }}
                        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (linkPreviewDismissedForCurrent) {
                            setDismissedLinkUrl(null);
                          } else {
                            setDismissedLinkUrl(detectedLink.url);
                          }
                        }}
                      >
                        <IconLink className="w-3 h-3" />
                        <span className="uppercase tracking-wide">LINK</span>
                      </button>
                      )}
                    </div>
                    {compactMobile && mobileSubmit}
                    {characterLimit && (
                    <div className="post-composer__counter absolute bottom-4 right-2 md:bottom-4 md:right-4 text-white/60 text-sm font-semibold pointer-events-none select-none z-10">
                      {serializedText.length}
                      /
                      {characterLimit}
                    </div>
                    )}
                  </div>

                  {showMediaFeatures && (postImages.error || postImages.progress || postImages.images.length > 0) && (
                  <div className="min-w-0 space-y-2 px-3 pb-3 pt-1">
                    {postImages.images.length > 0 && (
                      <div className="grid max-w-[440px] grid-cols-4 gap-2" aria-label={ts('images.selected')}>
                        {postImages.images.map((item, index) => (
                          <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/20">
                            <img src={item.preview} alt={ts('images.preview', { number: index + 1 })} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              disabled={isSubmitting}
                              aria-label={ts('images.remove', { number: index + 1 })}
                              onClick={() => postImages.remove(item.id)}
                              className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-white disabled:opacity-40"
                            >
                              <IconClose className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {!mediaFull && imageButton('tile')}
                      </div>
                    )}
                    {postImages.error && <p role="alert" className="text-sm text-red-300">{postImages.error}</p>}
                    {postImages.progress && <p role="status" className="text-sm text-white/70">{postImages.progress}</p>}
                  </div>
                  )}

                  {showLinkPreview && detectedLink && (
                  <div className="px-2.5 pb-2.5 pt-1 md:px-4 md:pb-3 md:pt-0">
                    <DetectedLinkPreview
                      link={detectedLink}
                      onDismiss={() => setDismissedLinkUrl(detectedLink.url)}
                    />
                  </div>
                  )}

                </div>

                <TokenTagOptionsBar
                  value={text}
                  onChange={acceptComposerText}
                  serialize={(s) => serializeMentions(s, mentions)}
                  textareaRef={textareaRef}
                  characterLimit={characterLimit}
                  className="mt-2.5"
                />

                {(isPost || hasMediaTools) && (
                <div className="post-composer__toolbar hidden md:flex items-center justify-between mt-3 gap-3">
                  {!usesComposerSurface && desktopTools}

                  <div className="post-composer__submit flex items-center gap-3">
                    {requiredHashtag && requiredMissing && (
                      <div className="flex items-center gap-2 text-[11px] text-white/70">
                        <span>{ts('postNeedsToInclude', { hashtag: (requiredHashtag || '').toUpperCase() })}</span>
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
                          title={ts('addRequiredHashtag')}
                        >
                          {ts('add')}
                        </button>
                      </div>
                    )}
                    {activeAccount ? (
                      <AeButton
                        type="submit"
                        loading={isSubmitting}
                        disabled={isSubmitting || !hasContent || (requiredHashtag ? requiredMissing : false)}
                        className="post-composer__primary relative bg-[#1161FE] border-none text-white font-black px-6 py-3 rounded-full cursor-pointer transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-[#1161FE] hover:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none md:min-h-[44px] md:text-base"
                      >
                        {(() => {
                          if (isSubmitting) {
                            return ts('posting');
                          }
                          if (isPost) {
                            return ts('post');
                          }
                          return ts('postReply');
                        })()}
                      </AeButton>
                    ) : (
                      <ConnectWalletButton className="post-composer__primary rounded-full" />
                    )}
                  </div>
                </div>
                )}
              </div>

            </div>

            {!compactMobile && mobileSubmit}
          </fieldset>
        </form>
      </div>
    </div>
  );
});

PostForm.displayName = 'PostForm';

export default PostForm;
export type { PostFormProps };
