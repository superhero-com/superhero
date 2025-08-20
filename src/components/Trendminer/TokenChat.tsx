import React, { useEffect, useState } from 'react';
import { QualiChatService, type QualiMessage } from '../../libs/QualiChatService';
import AeButton from '../AeButton';

type Props = { token: { name: string; address: string } };

export default function TokenChat({ token }: Props) {
  const [messages, setMessages] = useState<QualiMessage[]>([]);
  const [from, setFrom] = useState<string | undefined>();
  const [endReached, setEndReached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatTs(ts?: number) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString(); } catch { return ''; }
  }

  async function loadMore() {
    if (loading || endReached) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await QualiChatService.getTokenMessages(token.name, token.address, { from, limit: 20 });
      const onlyText = (resp?.data || []).filter((m) => m?.content?.msgtype === 'm.text');
      setMessages((prev) => [...prev, ...onlyText]);
      setFrom(resp?.end || undefined);
      if (!resp?.data?.length || !resp?.end) setEndReached(true);
    } catch (e: any) {
      if (e?.status === 404) {
        setEndReached(true);
      } else {
        setError('Unable to load comments');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setMessages([]); setFrom(undefined); setEndReached(false); }, [token?.address, token?.name]);
  useEffect(() => { loadMore(); /* initial */ }, [token?.address, token?.name]);

  return (
    <div className="token-chat" style={{ display: 'grid', gap: 8 }}>
      <div style={{ textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: 12 }}>
        <a href="https://quali.chat/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', padding: '8px 12px', borderRadius: 999 }}>Add comment</a>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Service provided by <strong>Quali.chat</strong></div>
      </div>
      {error && <div style={{ color: 'tomato' }}>{error}</div>}
      {!error && (
        <div style={{ display: 'grid', gap: 8 }}>
          {messages.map((m, idx) => (
            <div key={m.event_id || `${idx}`} style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.8, display: 'flex', justifyContent: 'space-between' }}>
                <span>{m.sender || 'user'}</span>
                <span>{formatTs(m.origin_server_ts)}</span>
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{m.content?.body}</div>
            </div>
          ))}
          {loading && new Array(3).fill(0).map((_, i) => (
            <div key={`s-${i}`} style={{ height: 42, borderRadius: 8, background: 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        {!endReached ? (
          <AeButton onClick={loadMore} disabled={loading} loading={loading} variant="ghost" size="medium">{loading ? 'Loading…' : 'Load more'}</AeButton>
        ) : (!messages.length && <div>There are no comments yet</div>)}
      </div>
    </div>
  );
}


