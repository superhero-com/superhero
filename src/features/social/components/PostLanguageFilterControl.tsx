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
};

// Shared content-language selector used next to home's Hot/Latest control and
// in the Explore Posts tab header. "All languages" clears the filter.
const PostLanguageFilterControl = ({
  value,
  onChange,
  className = '',
}: PostLanguageFilterControlProps) => {
  const { t, i18n } = useTranslation('common');

  return (
    <Select dir={i18n.dir()} value={value} onValueChange={(v) => onChange(v as PostLanguageFilter)}>
      <SelectTrigger
        aria-label={t('postLanguageFilter.label')}
        className={`h-11 max-w-full gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2 text-xs text-white transition-all duration-300 hover:bg-white/[0.08] focus:outline-none focus:border-[#1161FE] sm:min-w-[140px] [&>span]:!inline-flex ${className}`}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border border-white/10 text-white z-[1200]">
        <SelectItem value="all" className="min-h-11">{t('postLanguageFilter.allLanguages')}</SelectItem>
        {SUPPORTED_LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code} textValue={l.label} className="min-h-11">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-[1.4em] text-center shrink-0 leading-none">{l.flag}</span>
              <span lang={l.code} dir="auto">{l.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PostLanguageFilterControl;
