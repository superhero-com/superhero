import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { changeLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';

type LanguageSwitcherProps = {
  // `bar` is the roomy sidebar form (flag + name); `compact` is the tight
  // mobile-header form (flag only, full names still shown in the dropdown).
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
  const current = i18n.resolvedLanguage || i18n.language;
  const active = SUPPORTED_LANGUAGES.find((l) => l.code === current)
    ?? SUPPORTED_LANGUAGES.find((l) => l.code === 'en');

  return (
    <Select value={current} onValueChange={(v) => changeLanguage(v as LanguageCode)}>
      <SelectTrigger
        aria-label={t('aria.language')}
        className={`${compact
          ? 'h-auto w-auto min-h-[44px] justify-center gap-1.5 px-2'
          : 'h-auto w-full justify-between gap-2 px-3 py-2 text-sm'} bg-white/[0.02] border border-white/[0.06] rounded-lg text-[var(--light-font-color)] hover:bg-white/[0.05] ${className}`}
      >
        <span className="inline-flex items-center gap-2">
          <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-base leading-none" aria-hidden="true">{active?.flag}</span>
          {!compact && <span>{active?.label}</span>}
        </span>
      </SelectTrigger>
      <SelectContent
        side={side}
        align={align}
        className="bg-gray-900 border border-white/10 text-white z-[1200]"
      >
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

export default LanguageSwitcher;
