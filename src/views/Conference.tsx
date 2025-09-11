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
    <div className="max-w-[980px] mx-auto p-4">
      <iframe 
        id="jitsiConferenceFrame0" 
        title="Conference" 
        src={src} 
        className="w-full h-[80vh] border-0 rounded-lg shadow-lg" 
      />
    </div>
  );
}


