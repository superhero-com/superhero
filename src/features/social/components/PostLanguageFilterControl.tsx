import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import type { PostLanguageFilter } from '@/hooks/usePostLanguageFilter';

type PostLanguageFilterControlProps = {
  value: PostLanguageFilter;
  onChange: (value: PostLanguageFilter) => void;
  className?: string;
  variant?: 'dropdown' | 'buttons';
};

// Shared content-language selector used in home's feed filters and
// in the Explore Posts tab header. "All languages" clears the filter.
const PostLanguageFilterControl = ({
  value,
  onChange,
  className = '',
  variant = 'dropdown',
}: PostLanguageFilterControlProps) => {
  const { t } = useTranslation('common');

  if (variant === 'buttons') {
    const options = [
      { code: 'all', label: t('postLanguageFilter.allLanguages'), flag: '' },
      ...SUPPORTED_LANGUAGES,
    ];

    return (
      <div
        role="group"
        aria-label={t('postLanguageFilter.label')}
        className={`flex items-center justify-between gap-3 min-w-0 ${className}`}
      >
        <span className="text-xs text-white/70 min-w-[90px]">
          {t('postLanguageFilter.shortLabel')}
        </span>
        <div className="inline-flex shrink-0 items-center gap-0.5 bg-white/5 rounded-full p-0.5 border border-white/10">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              aria-label={option.label}
              title={option.label}
              aria-pressed={value === option.code}
              onClick={() => onChange(option.code as PostLanguageFilter)}
              className={`px-2 py-1 text-[10px] rounded-full border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1161FE] ${value === option.code
                ? 'bg-[#1161FE] text-white shadow-sm'
                : 'bg-transparent text-white/60 hover:text-white/90 hover:bg-white/10'}`}
            >
              {option.code === 'all' ? t('postLanguageFilter.allShort') : option.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v as PostLanguageFilter)}>
      <SelectTrigger
        aria-label={t('postLanguageFilter.label')}
        className={`h-10 gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2 text-xs text-white transition-all duration-300 hover:bg-white/[0.08] focus:outline-none focus:border-[#1161FE] sm:min-w-[140px] ${className}`}
      >
        <span className="!inline-flex items-center gap-2 min-w-0">
          <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border border-white/10 text-white z-[1200]">
        <SelectItem value="all">{t('postLanguageFilter.allLanguages')}</SelectItem>
        {SUPPORTED_LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-[1.4em] text-center shrink-0 leading-none">{l.flag}</span>
              <span>{l.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PostLanguageFilterControl;
