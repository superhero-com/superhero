import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useHashtagAllowedChars } from '../../../hooks/useCommunityFactory';
import {
  MODE_ORDER,
  MODE_PRESETS,
  applyTokenTagOptions,
  matchPreset,
  scanTokenTags,
  serializeTokenTagEnvelope,
  type TokenTagDisplayOptions,
  type TokenTagMode,
} from '../utils/tokenTagOptions';

interface TokenTagOptionsBarProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

const TOGGLE_KEYS: (keyof TokenTagDisplayOptions)[] = ['chart', 'price', 'change'];

/**
 * Surfaces a display-options control for every `#SYMBOL` token in the composer. A token tag
 * carries an optional `{...}` envelope describing how it renders; this bar edits that envelope
 * directly in the composer string — one buffer, the macro visible while composing — so nothing
 * is held in side-state that a paste or edit could desync. Renders nothing when there are no tags.
 */
const TokenTagOptionsBar = ({ value, onChange, className = '' }: TokenTagOptionsBarProps) => {
  const { t } = useTranslation();
  const ts = (key: string, options?: Record<string, unknown>) => t(`social.tokenTag.${key}`, options);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // The live collection alphabet, so the composer scans exactly the tokens the reader will honour.
  const hashtagAllowedChars = useHashtagAllowedChars();

  const tags = useMemo(
    () => scanTokenTags(value, hashtagAllowedChars),
    [value, hashtagAllowedChars],
  );
  const active = openIndex === null ? undefined : tags.find((tag) => tag.index === openIndex);

  // Close the popover if its token was edited away while it was open.
  useEffect(() => {
    if (openIndex !== null && !active) setOpenIndex(null);
  }, [openIndex, active]);

  useEffect(() => {
    if (openIndex === null) return undefined;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenIndex(null);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openIndex]);

  if (tags.length === 0) return null;

  const setMode = (ordinal: number, mode: TokenTagMode) => {
    onChange(applyTokenTagOptions(value, ordinal, MODE_PRESETS[mode], hashtagAllowedChars));
  };

  const toggleKey = (
    ordinal: number,
    current: TokenTagDisplayOptions,
    key: keyof TokenTagDisplayOptions,
  ) => {
    onChange(applyTokenTagOptions(
      value,
      ordinal,
      { ...current, [key]: !current[key] },
      hashtagAllowedChars,
    ));
  };

  const modeLabel = (options: TokenTagDisplayOptions): string => {
    const preset = matchPreset(options);
    return preset ? ts(`mode${preset[0].toUpperCase()}${preset.slice(1)}`) : ts('custom');
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
        const isOpen = openIndex === tag.index;
        return (
          <div key={`${tag.symbol}-${tag.index}`} className="relative">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              aria-label={ts('optionsFor', { symbol: tag.symbol })}
              title={ts('configure')}
              className={`inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full border text-xs font-semibold transition-colors ${
                isOpen
                  ? 'bg-primary-100/20 border-primary-400/60 text-primary-300'
                  : 'bg-white/5 border-white/12 text-white/80 hover:border-white/25 hover:text-white'
              }`}
              onClick={() => setOpenIndex(isOpen ? null : tag.index)}
            >
              <span className="text-primary-400">#</span>
              <span className="max-w-[120px] truncate">{tag.symbol}</span>
              <span className="text-white/45 font-normal">·</span>
              <span className="text-white/70">{modeLabel(tag.options)}</span>
            </button>

            {isOpen && active && (
              <div
                role="dialog"
                aria-label={ts('optionsFor', { symbol: active.symbol })}
                className="popover absolute z-30 bottom-[calc(100%+8px)] left-0 w-[248px] bg-gray-900 border border-white/12 rounded-2xl p-3 shadow-[0_16px_30px_rgba(0,0,0,0.5)]"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {MODE_ORDER.map((mode) => {
                    const selected = matchPreset(active.options) === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setMode(active.index, mode)}
                        className={`flex flex-col items-start gap-0.5 rounded-xl px-2 py-1.5 border text-left transition-colors ${
                          selected
                            ? 'bg-primary-100/20 border-primary-400/60 text-white'
                            : 'bg-white/5 border-white/10 text-white/80 hover:border-white/20'
                        }`}
                      >
                        <span className="text-xs font-bold">
                          {ts(`mode${mode[0].toUpperCase()}${mode.slice(1)}`)}
                        </span>
                        <span className="text-[10px] leading-tight text-white/50">
                          {ts(`mode${mode[0].toUpperCase()}${mode.slice(1)}Hint`)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5 flex items-center gap-1.5">
                  {TOGGLE_KEYS.map((key) => {
                    const on = active.options[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleKey(active.index, active.options, key)}
                        className={`flex-1 inline-flex items-center justify-center h-8 rounded-lg border text-xs font-semibold transition-colors ${
                          on
                            ? 'bg-primary-100/20 border-primary-400/60 text-primary-300'
                            : 'bg-white/5 border-white/10 text-white/55 hover:border-white/20'
                        }`}
                      >
                        {ts(`toggle${key[0].toUpperCase()}${key.slice(1)}`)}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-2 text-[10px] leading-tight text-white/45">
                  {ts('changeHint')}
                </p>

                <div className="mt-2.5 pt-2.5 border-t border-white/10">
                  <div className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">
                    {ts('postsAs')}
                  </div>
                  <code className="block mt-1 text-[11px] text-primary-300 break-all">
                    {`#${active.symbol}${serializeTokenTagEnvelope(active.options)}`}
                  </code>
                </div>

                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(null)}
                    className="h-7 px-3 rounded-full bg-white/10 border border-white/15 text-white/85 text-xs font-semibold hover:bg-white/15 transition-colors"
                  >
                    {ts('done')}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TokenTagOptionsBar;
