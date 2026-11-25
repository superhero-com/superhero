import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Check, Loader2, UserPlus, Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { relationshipKey, socialGraphScope, useSocialGraph } from '@/hooks/useSocialGraph';
import { useWalletConnect } from '@/hooks/useWalletConnect';

export const ShortsFollow = ({ address, onWalletPending }: {
  address: string; onWalletPending: (pending: boolean) => void;
}) => {
  const graph = useSocialGraph(address);
  const { connectWallet } = useWalletConnect();
  const { t } = useTranslation('common');
  const client = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const lock = useRef(false);
  const pending = connecting || !!graph.pendingAction;
  let Icon = graph.isFollowing ? Check : UserPlus;
  let label = t(graph.isFollowing ? 'socialGraph.following' : 'socialGraph.follow');
  if (!graph.viewer) { Icon = Wallet; label = t('socialGraph.connectToFollow'); }
  if (pending) Icon = Loader2;
  useEffect(() => { onWalletPending(pending); return () => onWalletPending(false); }, [pending, onWalletPending]);
  const act = async () => {
    if (lock.current) return;
    lock.current = true;
    setConnectionError('');
    try {
      if (!graph.viewer) {
        setConnecting(true);
        const connected = await connectWallet();
        if (!connected) setConnectionError('Wallet connection was not completed. Try again.');
      } else if (graph.isFollowing) await graph.unfollow();
      else await graph.follow();
    } catch { setConnectionError('Could not connect your wallet. Try again.'); } finally { lock.current = false; setConnecting(false); }
  };
  if (graph.isSelf) return null;
  if (graph.hasBlocked || graph.blockedByThem) {
    return (
      <p className="sv-follow-note">
        Following is unavailable for this account.
        <Link to={`/users/${address}`}>View profile</Link>
      </p>
    );
  }
  if (graph.configLoading || (graph.viewer && graph.relationshipLoading)) {
    return <p className="sv-follow-note" role="status">Loading follow status…</p>;
  }
  if (!graph.config?.contract_address || (graph.viewer && !graph.isReady)) {
    return (
      <div className="sv-follow-note" role="status">
        <span>Follow status is unavailable.</span>
        <button
          type="button"
          onClick={() => {
            client.invalidateQueries({ queryKey: ['SocialGraphService.getConfig', ...socialGraphScope()] });
            client.invalidateQueries({ queryKey: relationshipKey(graph.viewer, address, graph.config?.contract_address) });
          }}
        >
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="sv-follow-row">
      <button
        type="button"
        className={`sv-follow-button ${graph.isFollowing ? 'is-following' : ''} ${!graph.viewer ? 'needs-wallet' : ''}`}
        disabled={pending}
        onClick={act}
        aria-label={graph.isFollowing ? t('socialGraph.unfollow') : undefined}
        title={graph.isFollowing ? t('socialGraph.unfollow') : undefined}
      >
        <Icon size={16} className={pending ? 'animate-spin' : undefined} />
        {label}
      </button>
      {(graph.error || connectionError) && <p role="alert">{graph.error?.message || connectionError}</p>}
    </div>
  );
};
