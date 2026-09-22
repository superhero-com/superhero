import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  changeLanguage, SUPPORTED_LANGUAGES, toSupportedLanguage, type LanguageCode,
} from '@/i18n';
// Side-effect import: that module's `languageChanged` listener resets the post
// language preference, but the module lives in the lazily loaded feed chunks
// (see routes.tsx). This switcher is always mounted and is the one place a user
// changes language, so loading the module here guarantees the listener exists
// before the first change — otherwise a round trip made on a non-feed page
// (en → ar → en) resurrects a stale "All languages" choice on the next feed visit.
import '@/hooks/usePostLanguageFilter';

type LanguageSwitcherProps = {
  // `bar` is the roomy sidebar form (flag + name); `compact` is the tight
  // mobile-header form (flag only; native names remain in the dropdown).
  variant?: 'bar' | 'compact';
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  className?: string;
};

const LanguageSwitcher = ({
  variant = 'bar',
  side = 'bottom',
  align = 'start',
  className = '',
}: LanguageSwitcherProps) => {
  const { t, i18n } = useTranslation('common');
  const compact = variant === 'compact';
  const current = toSupportedLanguage(i18n.resolvedLanguage || i18n.language);
  const active = SUPPORTED_LANGUAGES.find((l) => l.code === current)
    ?? SUPPORTED_LANGUAGES.find((l) => l.code === 'en');

  return (
    <Select
      dir={i18n.dir()}
      value={current}
      onValueChange={(v) => changeLanguage(v as LanguageCode)}
    >
      <SelectTrigger
        aria-label={`${t('aria.language')}: ${active?.label}`}
        className={`${compact
          ? 'h-auto w-auto shrink-0 min-h-[44px] justify-center gap-1 px-2'
          : 'h-auto min-h-[44px] w-full justify-between gap-2 px-3 py-2 text-sm'} bg-white/[0.02] border border-white/[0.06] rounded-lg text-[var(--light-font-color)] hover:bg-white/[0.05] [&>span]:!inline-flex ${className}`}
      >
        <span className="inline-flex items-center gap-2">
          {!compact && <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />}
          <span className="text-base leading-none" aria-hidden="true">{active?.flag}</span>
          {!compact && <span lang={current} dir="auto">{active?.label}</span>}
        </span>
      </SelectTrigger>
      <SelectContent
        side={side}
        align={align}
        className="bg-gray-900 border border-white/10 text-white z-[1200]"
      >
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

export default LanguageSwitcher;
