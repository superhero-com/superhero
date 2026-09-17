import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';

type PostLanguageEmptyStateProps = {
  language: LanguageCode;
  onShowAll: () => void;
  className?: string;
};

// Shown when a language-filtered feed comes back empty. Offers a one-tap way
// back to "All languages" without changing the UI language.
const PostLanguageEmptyState = ({
  language,
  onShowAll,
  className = '',
}: PostLanguageEmptyStateProps) => {
  const { t } = useTranslation('common');
  const label = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.label ?? language;

  return (
    <div className={`w-full py-10 flex flex-col items-center gap-3 text-center ${className}`}>
      <p className="text-sm text-white/60">
        {t('postLanguageFilter.empty', { language: label })}
      </p>
      <button
        type="button"
        onClick={onShowAll}
        className="inline-flex items-center justify-center rounded-full bg-[#1161FE] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0e50d8]"
      >
        {t('postLanguageFilter.showAll')}
      </button>
    </div>
  );
};

export default PostLanguageEmptyState;
