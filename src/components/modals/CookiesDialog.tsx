import React from 'react';
import { useTranslation } from 'react-i18next';
import AeButton from '../AeButton';

const CookiesDialog = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="p-2">
      <h3 className="text-xl font-bold text-white mb-3">{t('common.modals.cookies.title')}</h3>
      <p className="text-white/80 mb-4 leading-relaxed">{t('common.modals.cookies.description')}</p>
      <div className="flex gap-2">
        <AeButton onClick={onClose}>{t('common.buttons.close')}</AeButton>
        <AeButton
          green
          onClick={async () => {
            await (dispatch as any)(setCookies({ scope: 'analytics', status: true }));
            onClose();
          }}
        >
          {t('common.modals.cookies.allow')}
        </AeButton>
      </div>
    </div>
  );
};

export default CookiesDialog;
