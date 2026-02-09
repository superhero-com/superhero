import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONFIG } from '../config';

const Conference = () => {
  const { t } = useTranslation('common');
  const { room } = useParams();
  const src = useMemo(() => {
    const opts = 'jitsi_meet_external_api_id=0&config.disableDeepLinking=false';
    const name = room || '';
    return `https://${CONFIG.JITSI_DOMAIN}/${name}#${opts}`;
  }, [room]);
  return (
    <div className="max-w-[980px] mx-auto p-4">
      <iframe
        id="jitsiConferenceFrame0"
        title={t('titles.conference')}
        src={src}
        className="w-full h-[80vh] border-0 rounded-lg shadow-lg"
      />
    </div>
  );
};

export default Conference;
