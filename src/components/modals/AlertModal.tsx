import React from 'react';
import { useTranslation } from 'react-i18next';
import AeButton from '../AeButton';

export default function AlertModal({
  title, body, failure, onClose,
}: { title?: string; body?: string; failure?: boolean; onClose: () => void }) {
  const { t } = useTranslation('common');
  return (
    <div>
      <h3>{title || (failure ? t('messages.somethingWentWrong') : t('messages.success'))}</h3>
      {body && <p>{body}</p>}
      <div style={{ textAlign: 'right' }}>
        <AeButton onClick={onClose}>{t('buttons.close')}</AeButton>
      </div>
    </div>
  );
}
