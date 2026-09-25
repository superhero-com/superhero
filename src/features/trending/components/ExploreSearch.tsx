import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Hash, MessageSquare, Search, Users, X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import type { SearchTab } from '../api/trendsSearch';
import './ExploreSearch.css';

const SECTIONS = [
  { key: 'tokens', label: 'tokenList.tabTokens', Icon: Hash },
  { key: 'users', label: 'tokenList.tabUsers', Icon: Users },
  { key: 'posts', label: 'tokenList.tabPosts', Icon: MessageSquare },
] as const;

interface ExploreSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  hasSearch: boolean;
}

const ExploreSearch = ({
  value, onChange, onClear, activeTab, onTabChange, hasSearch,
}: ExploreSearchProps) => {
  const { t, i18n } = useTranslation('trending');
  const input = useRef<HTMLInputElement>(null);
  const highlight = usePointerHighlight();

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.defaultPrevented || event.isComposing
        || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const { target } = event;
      if (target instanceof Element && target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), '
        + '[role="textbox"], [role="combobox"], [role="dialog"], [role="menu"], dialog',
      )) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]')) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const clearSearch = () => {
    onClear();
    input.current?.focus();
  };

  return (
    <div className="explore-entry" dir={i18n.dir()}>
      <div className="explore-search" {...highlight}>
        <Search className="explore-search__icon" aria-hidden="true" />
        <Input
          ref={input}
          id="trend-search"
          aria-label={t('tokenList.inputAria')}
          aria-keyshortcuts="/"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              clearSearch();
            }
          }}
          placeholder={t('tokenList.searchPlaceholder')}
          className="explore-search__input"
        />
        {value ? (
          <button
            type="button"
            className="explore-search__clear"
            onClick={clearSearch}
            aria-label={t('tokenList.clearSearch')}
          >
            <X aria-hidden="true" />
          </button>
        ) : <kbd className="explore-search__shortcut" aria-hidden="true">/</kbd>}
      </div>
      {!hasSearch && (
        <nav className="explore-sections" aria-label={t('tokenList.exploreSections')}>
          {SECTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className="explore-section"
              aria-pressed={activeTab === key}
              onClick={() => onTabChange(key)}
            >
              <Icon aria-hidden="true" />
              <span>{t(label)}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default ExploreSearch;
