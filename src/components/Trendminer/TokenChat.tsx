import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
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
    <div className="grid gap-2">
      <div className="text-center border border-white/20 rounded-xl p-3 bg-white/5">
        <a 
          href="https://quali.chat/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-block no-underline text-white bg-white/12 border border-white/25 px-3 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
        >
          Add comment
        </a>
        <div className="mt-1.5 text-xs opacity-70 text-white/70">
          Service provided by <strong>Quali.chat</strong>
        </div>
      </div>
      
      {error && (
        <div className="text-red-400 text-sm text-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
          {error}
        </div>
      )}
      
      {!error && (
        <div className="grid gap-2">
          {messages.map((m, idx) => (
            <div 
              key={m.event_id || `${idx}`} 
              className="border border-white/20 rounded-lg p-2.5 bg-white/5"
            >
              <div className="text-xs opacity-80 flex justify-between mb-0.5 text-white/80">
                <span>{m.sender || 'user'}</span>
                <span>{formatTs(m.origin_server_ts)}</span>
              </div>
              <div className="text-sm text-white">
                {m.content?.body}
              </div>
            </div>
          ))}
          
          {loading && new Array(3).fill(0).map((_, i) => (
            <div 
              key={`s-${i}`} 
              className="h-10.5 rounded-lg bg-white/8 animate-pulse"
            />
          ))}
        </div>
      )}
      
      <div className="text-center mt-1.5">
        {!endReached ? (
          <AeButton 
            onClick={loadMore} 
            disabled={loading} 
            loading={loading} 
            variant="ghost" 
            size="medium"
            className="min-w-24"
          >
            {loading ? 'Loading…' : 'Load more'}
          </AeButton>
        ) : (!messages.length && (
          <div className="text-sm text-white/60">There are no comments yet</div>
        ))}
      </div>
    </div>
  );
}


