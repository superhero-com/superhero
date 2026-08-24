import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
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

// The four rungs, strictly monotonic. Rung 0 is the badge-less "just the symbol" form —
// `{change=0}` on the wire — a first-class choice, not an override buried behind a toggle.
// No preset name (`tag`/`compact`/`advanced`) ever reaches the UI: each rung is labelled by
// what it shows, and the live preview is the real label.
const RUNG_OPTIONS: TokenTagDisplayOptions[] = [
  { chart: false, price: false, change: false }, // 0 · Symbol only
  MODE_PRESETS.tag, // 1 · Symbol + 24h change (default)
  MODE_PRESETS.compact, // 2 · + price
  MODE_PRESETS.advanced, // 3 · + price + chart
];

const PART_KEYS: (keyof TokenTagDisplayOptions)[] = ['change', 'price', 'chart'];

// Which rung a set of options is, or 'custom' for an off-ladder mix.
function rungOf(options: TokenTagDisplayOptions): number | 'custom' {
  if (!options.change && !options.price && !options.chart) return 0;
  const preset = matchPreset(options);
  if (preset === 'tag') return 1;
  if (preset === 'compact') return 2;
  if (preset === 'advanced') return 3;
  return 'custom';
}

// Character cost of a rung: the whole `#SYMBOL{...}` length, and the delta over the bare
// `#SYMBOL`. The macro counts against the post limit, so this is the one consequence the author
// cannot otherwise see — including that rung 0 costs more than the default, because turning the
// badge off means writing `{change=0}`.
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
  ts: Translate;
}

/**
 * The select-mode dialog: four rungs as a radiogroup, each a live preview of the pill at real
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
  ts,
}: RungLadderDialogProps) => {
  const { symbol } = active;
  const currentRung = rungOf(active.options);
  const [showCustom, setShowCustom] = useState(currentRung === 'custom');
  const rungRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  const setRung = (rung: number) => onChange(
    applyTokenTagOptions(value, active.index, RUNG_OPTIONS[rung], allowedChars),
  );
  const togglePart = (key: keyof TokenTagDisplayOptions) => onChange(
    applyTokenTagOptions(
      value,
      active.index,
      { ...active.options, [key]: !active.options[key] },
      allowedChars,
    ),
  );

  const focusRung = (rung: number) => rungRefs.current[Math.max(0, Math.min(3, rung))]?.focus();

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
      const next = Math.max(0, rung - 1);
      setRung(next); focusRung(next);
    }
  };

  const overLimit = value.length > characterLimit;

  return (
    <div
      role="dialog"
      aria-label={ts('optionsFor', { symbol })}
      className="token-tag-dialog fixed inset-x-2 bottom-2 z-50 rounded-2xl border border-white/12 bg-gray-900 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)] md:absolute md:inset-auto md:top-[calc(100%+8px)] md:left-0 md:w-[380px]"
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
        {RUNG_OPTIONS.map((options, rung) => {
          const selected = currentRung === rung;
          const cost = rungCost(symbol, options);
          const label = ts(`rung${rung}`);
          return (
            <div
              key={`rung-${label}`}
              role="radio"
              aria-checked={selected}
              aria-label={rung === 1 ? `${label}, ${ts('default')}` : label}
              tabIndex={selected || (currentRung === 'custom' && rung === 1) ? 0 : -1}
              ref={(el) => { rungRefs.current[rung] = el; }}
              onClick={() => setRung(rung)}
              onKeyDown={(e) => onRungKeyDown(e, rung)}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 cursor-pointer min-h-[44px] transition-colors ${
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
                <TokenPill symbol={symbol} options={options} token={token} status={previewStatus} />
              </span>
              <span aria-hidden className="flex flex-col items-end text-right flex-shrink-0">
                <span className="text-[11px] text-white/80 tabular-nums">{`${cost.total} ${ts('chars')}`}</span>
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
          {`${value.length} / ${characterLimit}`}
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
};

interface TokenTagOptionsBarProps {
  value: string;
  onChange: (next: string) => void;
  /** The composer textarea, so a chip can highlight the exact occurrence it edits. */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  characterLimit?: number;
  className?: string;
}

type OpenState = { ordinal: number; symbol: string } | null;

/**
 * A chip bar over the composer: one chip per token occurrence in the post, each showing the
 * shape it is currently set to. Tapping a chip opens a ladder of four rungs — each a live
 * preview of the widget at real size. The bar edits the `{...}` envelope directly in the single
 * composer string, so nothing is held in side-state a paste or edit could desync. Renders nothing
 * when there are no tags.
 */
const TokenTagOptionsBar = ({
  value, onChange, textareaRef, characterLimit = 280, className = '',
}: TokenTagOptionsBarProps) => {
  const { t } = useTranslation();
  const ts: Translate = (key, options) => t(`social.tokenTag.${key}`, options);
  const [open, setOpen] = useState<OpenState>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openChipRef = useRef<HTMLButtonElement | null>(null);

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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (tags.length === 0) return null;

  // Highlight the exact occurrence a chip edits by selecting its span in the textarea. Two
  // occurrences of one symbol are otherwise indistinguishable in the bar. Selection is set
  // without stealing keyboard focus, so Tab through the chips is not disrupted; a mouse hover
  // additionally focuses so the highlight is unmistakable.
  const highlightOccurrence = (tag: ScannedTokenTag, focus: boolean) => {
    const el = textareaRef?.current;
    if (!el) return;
    try {
      el.setSelectionRange(tag.start, tag.end);
      if (focus) el.focus();
    } catch {
      /* setSelectionRange throws on a detached node — ignore */
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
              onMouseEnter={() => highlightOccurrence(tag, true)}
              onFocus={() => highlightOccurrence(tag, false)}
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
