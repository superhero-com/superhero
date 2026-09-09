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
        // embed sandboxing: cross-origin embed, previously unsandboxed. Jitsi Meet
        // is a full SPA (not just a media player) so its allowlist is necessarily broader than
        // YouTube/Spotify's: allow-scripts + allow-same-origin for the app itself and WebRTC/
        // storage on the Jitsi origin; allow-forms for the pre-join display-name/password
        // prompts; allow-popups for invite/share links; allow-modals for native confirm/alert
        // dialogs (e.g. "leave call?"); allow-presentation for cast/PiP. This was reasoned from
        // Jitsi's documented feature set (this environment has no reachable network path to
        // meet.jit.si to click-through verify live, unlike YouTube/Spotify above -- flagged to
        // TL/QA for a manual smoke test before merge). No `allow=` (camera/microphone Permissions
        // Policy) attribute exists on this iframe before or after this change -- adding one is
        // out of embed sandboxing's scope.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
      />
    </div>
  );
};

export default Conference;
