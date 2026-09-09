import React, {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { TokensService } from '@/api/generated';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { toTokenLookupParam } from '@/utils/address';
import { TokenPill } from '@/components/social/PostTokenTag';
import { useHashtagAllowedChars } from '../../../hooks/useCommunityFactory';
import {
  MODE_PRESETS,
  applyTokenTagOptions,
  matchPreset,
  scanTokenTags,
  serializeTokenTagEnvelope,
  type ScannedTokenTag,
  type TokenTagDisplayOptions,
} from '../utils/tokenTagOptions';

type Translate = (key: string, options?: Record<string, unknown>) => string;

// Where the portalled dialog paints: anchored under the chip on desktop, or a bottom sheet.
type Placement = { desktop: boolean; top: number; left: number };

// The three rungs, strictly monotonic, numbered 1–3 so the percentage-only default stays rung 1.
// The badge-less `{change=0}` form is still a readable wire value, but it is no longer offered as
// a rung — an author who wants it reaches it through Customize, where it reads as an off-ladder
// mix. No preset name (`tag`/`compact`/`advanced`) ever reaches the UI: each rung is labelled by
// what it shows, and the live preview is the real label.
const RUNG_OPTIONS: TokenTagDisplayOptions[] = [
  MODE_PRESETS.tag, // 1 · Symbol + 24h change (default)
  MODE_PRESETS.compact, // 2 · + price
  MODE_PRESETS.advanced, // 3 · + price + chart
];

const PART_KEYS: (keyof TokenTagDisplayOptions)[] = ['change', 'price', 'chart'];

// Which rung a set of options is, or 'custom' for an off-ladder mix — the badge-less `{change=0}`
// form now among them, since it is no longer a rung of its own.
function rungOf(options: TokenTagDisplayOptions): number | 'custom' {
  const preset = matchPreset(options);
  if (preset === 'tag') return 1;
  if (preset === 'compact') return 2;
  if (preset === 'advanced') return 3;
  return 'custom';
}

// Character cost of a rung: the whole `#SYMBOL{...}` length, and the delta over the bare
// `#SYMBOL`. The macro counts against the post limit, so this is the one consequence the author
// cannot otherwise see.
function rungCost(symbol: string, options: TokenTagDisplayOptions) {
  const envelope = serializeTokenTagEnvelope(options);
  const bare = symbol.length + 1; // '#' + symbol
  return { total: bare + envelope.length, delta: envelope.length };
}

interface RungLadderDialogProps {
  active: ScannedTokenTag;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
  characterLimit: number;
  allowedChars: string;
  // Expand the composer string to its on-the-wire form so cost and the cap are measured on the
  // macro that posts, not the shorter display run. Identity by default (display === wire).
  serialize: (s: string) => string;
  // The chip the dialog anchors under. The dialog is portalled to <body> to escape the composer
  // card's `backdrop-blur` stacking context (a raised z-index inside it cannot beat the feed
  // painted after it), so it positions against this element's viewport rect instead of the DOM.
  anchorEl: HTMLElement | null;
  // Set on the portalled dialog root so the bar's outside-click handler, which now lives in a
  // different part of the tree, can tell a click inside the dialog from one truly outside.
  dialogRef: React.RefObject<HTMLDivElement>;
  ts: Translate;
}

/**
 * The select-mode dialog: three rungs as a radiogroup, each a live preview of the pill at real
 * size, plus a "Customize parts" disclosure that auto-opens on an off-ladder mix. Anchored below
 * the composer on desktop, a bottom sheet on narrow — never over the text being edited.
 */
const RungLadderDialog = ({
  active,
  value,
  onChange,
  onClose,
  characterLimit,
  allowedChars,
  serialize,
  anchorEl,
  dialogRef,
  ts,
}: RungLadderDialogProps) => {
  const { symbol } = active;
  const currentRung = rungOf(active.options);
  const [showCustom, setShowCustom] = useState(currentRung === 'custom');
  const rungRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Placement, recomputed from the chip's viewport rect. Desktop: anchored just under the chip,
  // clamped to stay on-screen. Narrow: a viewport-fixed bottom sheet, which the portal now makes
  // genuinely fixed rather than a containing-block accident of the `md:`-only card blur.
  const [placement, setPlacement] = useState<Placement | null>(null);
  const place = useCallback(() => {
    const desktop = typeof window !== 'undefined'
      && window.matchMedia('(min-width: 768px)').matches;
    if (!desktop) { setPlacement({ desktop: false, top: 0, left: 0 }); return; }
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    const DIALOG_W = 380;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - DIALOG_W - 8));
    setPlacement({ desktop: true, top: r.bottom + 8, left });
  }, [anchorEl]);

  useLayoutEffect(place, [place]);
  useEffect(() => {
    place();
    // Capture phase so a scroll in any ancestor, not just the window, repositions the dialog.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [place]);

  // Off-ladder mixes disclose the switches automatically; no rung is lit because none is true.
  useEffect(() => {
    if (rungOf(active.options) === 'custom') setShowCustom(true);
  }, [active.options]);

  // Escape closes and returns focus to the chip. Bound on the document so the non-interactive
  // dialog container carries no keyboard listener of its own.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Real price and real 24h change, so choosing is pointing at the picture you want.
  const query = useQuery<TokenDto | null>({
    queryKey: ['post-token-tag', symbol.toUpperCase()],
    queryFn: () => TokensService.findByAddress({ address: toTokenLookupParam(symbol) }),
    staleTime: 60 * 1000,
    enabled: Boolean(symbol),
    retry: false,
  });
  const token = query.data;
  let previewStatus: 'loading' | 'resolved' | 'unknown' = 'resolved';
  if (query.status === 'error' || (query.status === 'success' && !token)) previewStatus = 'unknown';
  else if (query.status === 'pending' && !token) previewStatus = 'loading';

  // A proposed edit is refused only when it grows the post PAST the cap on the serialised
  // string — a reduction is always allowed, even from an already-over state, so the author is
  // never trapped. This is what stops the dialog offering a rung that does not actually fit.
  const currentSerialized = serialize(value).length;
  const wouldExceed = (next: string) => {
    const nextLen = serialize(next).length;
    return nextLen > characterLimit && nextLen > currentSerialized;
  };

  const applyIfFits = (next: string) => {
    if (wouldExceed(next)) return;
    onChange(next);
  };
  // Rungs are numbered 1–3; RUNG_OPTIONS is 0-indexed, so a rung maps to `rung - 1`.
  const setRung = (rung: number) => applyIfFits(
    applyTokenTagOptions(value, active.index, RUNG_OPTIONS[rung - 1], allowedChars),
  );
  const togglePart = (key: keyof TokenTagDisplayOptions) => applyIfFits(
    applyTokenTagOptions(
      value,
      active.index,
      { ...active.options, [key]: !active.options[key] },
      allowedChars,
    ),
  );

  const focusRung = (rung: number) => rungRefs.current[Math.max(1, Math.min(3, rung))]?.focus();

  // ↑↓ / ←→ move and select; Space/Enter select. Handled per-radio so the radiogroup container
  // carries no keyboard listener of its own.
  const onRungKeyDown = (e: React.KeyboardEvent, rung: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault(); setRung(rung);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(3, rung + 1);
      setRung(next); focusRung(next);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.max(1, rung - 1);
      setRung(next); focusRung(next);
    }
  };

  const overLimit = currentSerialized > characterLimit;

  if (!placement) return null;

  const style: React.CSSProperties = placement.desktop
    ? {
      position: 'fixed', top: placement.top, left: placement.left, width: 380, maxWidth: 'calc(100vw - 16px)', zIndex: 2000,
    }
    : {
      position: 'fixed', left: 8, right: 8, bottom: 8, zIndex: 2000, maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto',
    };

  const dialog = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={ts('optionsFor', { symbol })}
      style={style}
      className="token-tag-dialog rounded-2xl border border-white/12 bg-gray-900 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
    >
      {/* Identity header — the token being edited, named once. */}
      <div className="flex items-start gap-2">
        <span
          className="sh-pill__mark"
          aria-hidden
          style={{
            fontSize: '11px', width: 26, height: 26, borderRadius: 8,
          }}
        >
          {symbol.slice(0, 2)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{symbol}</div>
          <div className="text-[11px] text-white/45">{ts('howItAppears')}</div>
        </div>
        <button
          type="button"
          aria-label={ts('close')}
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] -mt-1.5 -mr-1.5 flex items-center justify-center text-white/50 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>

      {/* The ladder — a radiogroup. Each rung's accessible name is its text label, never the
          preview. */}
      <div
        role="radiogroup"
        aria-label={ts('optionsFor', { symbol })}
        className="mt-2 flex flex-col gap-1"
      >
        {RUNG_OPTIONS.map((options, i) => {
          const rung = i + 1; // rungs are 1-based; the badge-less rung 0 was removed
          const selected = currentRung === rung;
          const cost = rungCost(symbol, options);
          const label = ts(`rung${rung}`);
          // This rung's own proposed string, so the ladder shows honestly which rungs do not fit
          // rather than offering one and silently dropping it.
          const exceeds = !selected
            && wouldExceed(applyTokenTagOptions(value, active.index, options, allowedChars));
          return (
            <div
              key={`rung-${label}`}
              role="radio"
              aria-checked={selected}
              aria-disabled={exceeds || undefined}
              aria-label={rung === 1 ? `${label}, ${ts('default')}` : label}
              tabIndex={selected || (currentRung === 'custom' && rung === 1) ? 0 : -1}
              ref={(el) => { rungRefs.current[rung] = el; }}
              onClick={() => setRung(rung)}
              onKeyDown={(e) => onRungKeyDown(e, rung)}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 min-h-[44px] transition-colors ${
                exceeds ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              } ${
                selected
                  ? 'bg-primary-100/15 border-primary-400/60'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              <span
                aria-hidden
                className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 ${
                  selected ? 'border-primary-400 bg-primary-400/40' : 'border-white/30'
                }`}
              />
              <span aria-hidden className="sh-pill-preview pointer-events-none flex-1 min-w-0 overflow-hidden text-[13px] leading-snug">
                <TokenPill
                  symbol={symbol}
                  options={options}
                  token={token}
                  status={previewStatus}
                  preview
                />
              </span>
              <span aria-hidden className="flex flex-col items-end text-right flex-shrink-0">
                <span className={`text-[11px] tabular-nums ${exceeds ? 'text-rose-400 font-semibold' : 'text-white/80'}`}>{`${cost.total} ${ts('chars')}`}</span>
                <span className={`text-[10px] tabular-nums ${rung === 1 ? 'text-primary-300' : 'text-white/40'}`}>
                  {rung === 1 ? ts('default') : `+${cost.delta}`}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Customize is disclosed, not always-on. */}
      <div className="mt-2 border-t border-white/10 pt-2">
        <button
          type="button"
          aria-expanded={showCustom}
          onClick={() => setShowCustom((v) => !v)}
          className="w-full flex items-center justify-between text-left min-h-[44px] text-xs font-semibold text-white/70 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-white/40">{showCustom ? '⌄' : '›'}</span>
            {ts('customize')}
          </span>
          <span aria-hidden className="text-[10px] text-white/35 font-normal">{ts('customizeHint')}</span>
        </button>

        {showCustom && (
          <div className="mt-1.5 flex flex-col gap-1">
            {PART_KEYS.map((key) => {
              const on = active.options[key];
              const partLabel = ts(`switch${key[0].toUpperCase()}${key.slice(1)}`);
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={partLabel}
                  onClick={() => togglePart(key)}
                  className="flex items-center justify-between min-h-[44px] px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-xs text-white/85">{partLabel}</span>
                  <span className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${on ? 'text-primary-300' : 'text-white/40'}`}>
                      {on ? ts('on') : ts('off')}
                    </span>
                    <span className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-primary-500/70' : 'bg-white/15'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Emitted string — quiet reference, not a headline; the macro is already in the textarea.
          The dialog never blocks: the composer's own counter owns the over-limit error. */}
      <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
        <code className="flex-1 min-w-0 text-[11px] text-white/55 break-all">
          {`#${symbol}${serializeTokenTagEnvelope(active.options)}`}
        </code>
        <span className={`text-[11px] tabular-nums ${overLimit ? 'text-rose-400 font-semibold' : 'text-white/45'}`}>
          {`${currentSerialized} / ${characterLimit}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[36px] px-3.5 rounded-full bg-primary-500/80 hover:bg-primary-500 text-black text-xs font-bold transition-colors"
        >
          {ts('done')}
        </button>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

interface TokenTagOptionsBarProps {
  value: string;
  onChange: (next: string) => void;
  /** The composer textarea, so a chip can highlight the exact occurrence it edits. */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  characterLimit?: number;
  /**
   * Expand a composer string to its on-the-wire form (account display runs → `[account:…]`),
   * so the dialog measures the cap against the macro that actually posts. Defaults to identity
   * for a token-only body where display and wire are the same.
   */
  serialize?: (s: string) => string;
  className?: string;
}

type OpenState = { ordinal: number; symbol: string } | null;

/**
 * A chip bar over the composer: one chip per token occurrence in the post, each showing the
 * shape it is currently set to. Tapping a chip opens a ladder of three rungs — each a live
 * preview of the widget at real size. The bar edits the `{...}` envelope directly in the single
 * composer string, so nothing is held in side-state a paste or edit could desync. Renders nothing
 * when there are no tags.
 */
const TokenTagOptionsBar = ({
  value, onChange, textareaRef, characterLimit = 280, serialize = (s) => s, className = '',
}: TokenTagOptionsBarProps) => {
  const { t } = useTranslation();
  const ts: Translate = (key, options) => t(`social.tokenTag.${key}`, options);
  const [open, setOpen] = useState<OpenState>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openChipRef = useRef<HTMLButtonElement | null>(null);
  const priorSelectionRef = useRef<{ start: number; end: number; hadFocus: boolean } | null>(null);

  const hashtagAllowedChars = useHashtagAllowedChars();
  const tags = useMemo(
    () => scanTokenTags(value, hashtagAllowedChars),
    [value, hashtagAllowedChars],
  );

  // Guard: resolve the open tag by BOTH its ordinal and its symbol, re-derived from the current
  // string every render. Typing a new token earlier in the body shifts ordinals; without the
  // symbol check, ordinal 1 silently becomes a different occurrence and the next edit writes onto
  // the wrong span. When it no longer matches, the popover closes rather than mis-writing.
  const active = open
    ? tags.find((tag) => tag.index === open.ordinal && tag.symbol === open.symbol)
    : undefined;

  useEffect(() => {
    if (open && !active) setOpen(null);
  }, [open, active]);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      // The dialog is portalled to <body>, outside containerRef — so a click inside it must be
      // recognised here too, or every click on the dialog would read as "outside" and close it.
      if (containerRef.current?.contains(target)) return;
      if (dialogRef.current?.contains(target)) return;
      setOpen(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (tags.length === 0) return null;

  // Highlight the occurrence a chip edits by selecting its span in the textarea, so two chips for
  // one symbol are distinguishable. A mouse hover also focuses so the highlight paints; keyboard
  // focus does not, or Tab into the bar would bounce straight back to the textarea. The prior
  // selection and focus are captured and restored when the pointer or focus leaves without a
  // click, so a chip crossed on the way elsewhere never leaves the tag selected in a focused
  // textarea for the next keystroke to delete.
  const beginHighlight = (tag: ScannedTokenTag, focusTextarea: boolean) => {
    const el = textareaRef?.current;
    if (!el) return;
    try {
      if (priorSelectionRef.current === null) {
        priorSelectionRef.current = {
          start: el.selectionStart ?? el.value.length,
          end: el.selectionEnd ?? el.value.length,
          hadFocus: document.activeElement === el,
        };
      }
      el.setSelectionRange(tag.start, tag.end);
      if (focusTextarea) el.focus();
    } catch {
      /* setSelectionRange throws on a detached node — ignore */
    }
  };

  const endHighlight = (tag: ScannedTokenTag) => {
    const el = textareaRef?.current;
    const prior = priorSelectionRef.current;
    priorSelectionRef.current = null;
    if (!el || !prior) return;
    // A clicked chip opened its dialog to edit that tag — leave the span highlighted for it.
    if (open && open.ordinal === tag.index && open.symbol === tag.symbol) return;
    try {
      el.setSelectionRange(prior.start, prior.end);
      if (!prior.hadFocus) el.blur();
    } catch {
      /* ignore */
    }
  };

  const describeChip = (options: TokenTagDisplayOptions): string => {
    const rung = rungOf(options);
    return rung === 'custom' ? ts('custom') : ts(`rung${rung}`);
  };

  const closeAndReturnFocus = () => {
    setOpen(null);
    openChipRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-wrap items-center gap-2 ${className}`}
    >
      <span className="text-[11px] uppercase tracking-wide text-white/45 font-semibold">
        {ts('barLabel')}
      </span>
      {tags.map((tag) => {
        const isOpen = Boolean(active && active.index === tag.index);
        return (
          <div key={`${tag.symbol}-${tag.index}`} className="relative">
            <button
              type="button"
              ref={isOpen ? openChipRef : undefined}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              aria-label={`${ts('optionsFor', { symbol: tag.symbol })}, ${ts('occurrence', { n: tag.index + 1 })}`}
              className={`inline-flex items-center gap-1.5 min-h-[44px] pl-2.5 pr-2 py-1 rounded-full border text-xs font-semibold transition-colors ${
                isOpen
                  ? 'bg-primary-100/20 border-primary-400/60 text-primary-300'
                  : 'bg-white/5 border-white/12 text-white/80 hover:border-white/25 hover:text-white'
              }`}
              onClick={(e) => {
                openChipRef.current = e.currentTarget;
                setOpen(isOpen ? null : { ordinal: tag.index, symbol: tag.symbol });
              }}
              onMouseEnter={() => beginHighlight(tag, true)}
              onMouseLeave={() => endHighlight(tag)}
              onFocus={() => beginHighlight(tag, false)}
              onBlur={() => endHighlight(tag)}
            >
              <span className="text-primary-400">#</span>
              <span className="max-w-[120px] truncate">{tag.symbol}</span>
              <span className="text-white/45 font-normal">·</span>
              <span className="text-white/70">{describeChip(tag.options)}</span>
              <span aria-hidden className="text-white/40">{isOpen ? '⌃' : '⌄'}</span>
            </button>

            {isOpen && active && (
              <RungLadderDialog
                active={active}
                value={value}
                onChange={onChange}
                onClose={closeAndReturnFocus}
                characterLimit={characterLimit}
                allowedChars={hashtagAllowedChars}
                serialize={serialize}
                anchorEl={openChipRef.current}
                dialogRef={dialogRef}
                ts={ts}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TokenTagOptionsBar;
