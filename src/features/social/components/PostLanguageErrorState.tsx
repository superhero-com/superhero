import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';

type Props = {
  language: LanguageCode;
  onRetry: () => void;
  onShowAll: () => void;
};

const PostLanguageErrorState = ({ language, onRetry, onShowAll }: Props) => {
  const { t } = useTranslation('common');
  const label = SUPPORTED_LANGUAGES.find((item) => item.code === language)?.label ?? language;
  return (
    <div role="alert" className="w-full px-4 py-10 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-white/70">
        {t('postLanguageFilter.error', { language: label })}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          {t('buttons.retry')}
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className="min-h-11 rounded-full bg-[#1161FE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e50d8]"
        >
          {t('postLanguageFilter.showAll')}
        </button>
      </div>
    </div>
  );
};

export default PostLanguageErrorState;
