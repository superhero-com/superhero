import { AeSdk } from '@aeternity/aepp-sdk';
import { useEffect, useMemo, useState } from 'react';
import { useAeSdk } from '../../hooks';
import { getAffiliationTreasury } from '../../libs/affiliation';
import { getActiveAccountInviteList, getSecretKeyByInvitee, prepareInviteLink, removeStoredInvite } from '../../libs/invitation';
import AeButton from '../AeButton';

type Tx = { tx?: { function?: string; arguments?: any[] }; hash?: string; microTime?: number };


export default function InvitationList() {
  const { sdk, activeAccount } = useAeSdk();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [claimedMap, setClaimedMap] = useState<Record<string, boolean>>({});
  const [revoking, setRevoking] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLinks, setShowLinks] = useState(false);

  const list = useMemo(() => getActiveAccountInviteList(activeAccount), [activeAccount]);

  const invitations = useMemo(() => {
    const result: Array<{
      invitee: string; status: 'created' | 'claimed' | 'revoked'; amount: number; date?: string; hash?: string; invitationSecretKey?: string;
    }> = [];
    for (const tx of transactions) {
      if (tx?.tx?.function !== 'register_invitation_code') continue;
      const invitees = tx.tx.arguments?.[0]?.value?.map((x: any) => x.value) || [];
      const amount = Number(tx.tx.arguments?.[2]?.value || 0) / 1e18;
      for (const invitee of invitees) {
        const secret = getSecretKeyByInvitee(activeAccount, invitee);
        const revoked = Boolean(transactions.find((t) => t?.tx?.function === 'revoke_invitation_code' && t?.tx?.arguments?.[0]?.value === invitee));
        const claimed = Boolean(claimedMap[invitee]);
        const status: 'created' | 'claimed' | 'revoked' = claimed ? 'claimed' : (revoked ? 'revoked' : 'created');
        result.push({ invitee, status, amount, date: tx.microTime ? new Date(tx.microTime).toLocaleString() : undefined, hash: tx.hash, invitationSecretKey: secret });
      }
    }
    return result;
  }, [transactions, activeAccount, claimedMap]);

  useEffect(() => {
    let stop = false;
    async function loadTx() {
      if (!activeAccount) return;
      setLoading(true);
      try {
        // middleware v3 query compatible with vue impl
        const { CONFIG } = await import('../../config');
        const contract = 'ct_2GG42rs2FDPTXuUCWHMn98bu5Ab6mgNxY7KdGAKUNsrLqutNxZ';
        const url = `${CONFIG.MIDDLEWARE_URL}/v3/transactions?contract=${contract}&caller_id=${activeAccount}`;
        const res = await fetch(url);
        const json = await res.json();
        const data: Tx[] = Array.isArray(json?.data) ? json.data : [];
        if (!stop) setTransactions(data);
      } catch {
        if (!stop) setTransactions([]);
      } finally {
        if (!stop) setLoading(false);
      }
    }
    loadTx();
    return () => { stop = true; };
  }, [activeAccount]);

  useEffect(() => {
    let cancelled = false;
    async function markClaimed() {
      try {
        if (!sdk || !activeAccount) return;
        const treasury = await getAffiliationTreasury(sdk);
        const map: Record<string, boolean> = {};
        // For each item, check invitee history by trying to find redeem tx through middleware-lite approach
        // Optimization: we only check unique invitees from known tx list
        const uniqueInvitees = new Set<string>();
        transactions.forEach((t) => {
          if (t?.tx?.function === 'register_invitation_code') {
            t?.tx?.arguments?.[0]?.value?.forEach((it: any) => uniqueInvitees.add(it.value));
          }
        });
        await Promise.all(Array.from(uniqueInvitees).map(async (invitee) => {
          try {
            const info = await treasury.getInvitationCode(invitee);
            map[invitee] = Boolean(info?.[2]);
          } catch { map[invitee] = false; }
        }));
        if (!cancelled) setClaimedMap(map);
      } catch { }
    }
    if (transactions.length) markClaimed();
    return () => { cancelled = true; };
  }, [transactions, activeAccount]);

  async function revoke(invitee: string) {
    setRevoking(invitee);
    try {
      const treasury = await getAffiliationTreasury(sdk as AeSdk);
      await (treasury as any).revokeInvitationCode(invitee);
      removeStoredInvite(activeAccount, invitee);
      // soft update status
      setClaimedMap((m) => ({ ...m, [invitee]: true }));
    } catch (e) {
      // noop
    } finally {
      setRevoking(null);
    }
  }

  if (!activeAccount) return null;

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }}>
      <div style={{ padding: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span>Your Invitations</span>
        <AeButton onClick={() => setShowLinks((v) => !v)} variant="ghost" size="small">
          {showLinks ? 'Hide invite links' : 'Show invite links'}
        </AeButton>
      </div>
      <div style={{ padding: '0 12px 8px', fontSize: 12, opacity: 0.75 }}>
        Inviter: <span style={{ fontFamily: 'monospace' }}>{activeAccount}</span>
      </div>
      {loading && <div style={{ padding: 12 }}>Loading…</div>}
      {!loading && invitations.length === 0 && (
        <div style={{ padding: 12, opacity: 0.8, fontSize: 13 }}>No invitations yet.</div>
      )}
      <div style={{ display: 'grid' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px 140px', gap: 8, padding: '8px 12px', fontSize: 12, opacity: 0.7 }}>
          <div>Invitee</div>
          <div>Amount</div>
          <div>Status / Link</div>
          <div style={{ textAlign: 'right' }}>Action</div>
        </div>
        {invitations.map((it) => (
          <div key={`${it.invitee}-${it.hash}`} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px 140px', gap: 8, alignItems: 'center', padding: '8px 12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12 }}>
              <div style={{ fontFamily: 'monospace' }}>{it.invitee}</div>
              {it.date && <div style={{ fontSize: 11, opacity: 0.7 }}>{it.date}</div>}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{it.amount.toFixed(4)} AE</div>
            <div>
              {showLinks && it.invitationSecretKey && it.status === 'created' ? (
                <input value={prepareInviteLink(it.invitationSecretKey)} readOnly onFocus={(e) => e.currentTarget.select()} style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 12 }} />
              ) : (
                <span style={{ fontSize: 12, opacity: 0.7 }}>{it.status.toUpperCase()}</span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {it.status === 'created' && (
                <AeButton onClick={() => revoke(it.invitee)} disabled={revoking === it.invitee} loading={revoking === it.invitee} variant="ghost" size="small">{revoking === it.invitee ? 'Reclaiming…' : 'Reclaim'}</AeButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


