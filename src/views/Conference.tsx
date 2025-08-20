import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CONFIG } from '../config';

export default function Conference() {
  const { room } = useParams();
  const src = useMemo(() => {
    const opts = 'jitsi_meet_external_api_id=0&config.disableDeepLinking=false';
    const name = room || '';
    return `https://${CONFIG.JITSI_DOMAIN}/${name}#${opts}`;
  }, [room]);
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <iframe id="jitsiConferenceFrame0" title="Conference" src={src} style={{ width: '100%', height: '80vh', border: 0 }} />
    </div>
  );
}


