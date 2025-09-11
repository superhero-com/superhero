import React, { useEffect, useMemo, useState } from 'react';
import WalletConnectBtn from '../../components/WalletConnectBtn';
import { useLocation } from 'react-router-dom';
import { AeSdk } from '@aeternity/aepp-sdk';
import { TrendminerApi } from '../../api/backend';
import AeButton from '../../components/AeButton';
import BigNumber from 'bignumber.js';
import { calculateBuyPriceWithAffiliationFee, calculateTokensFromAE, toAe, toDecimals } from '../../utils/bondingCurve';
import { useAeSdk } from '../../hooks';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function CreateToken() {
  const { sdk } = useAeSdk();
  const query = useQuery();
  const [name, setName] = useState('');
  // Symbol is always same as name (unified input)
  const symbol = name;
  const [initialBuyVolume, setInitialBuyVolume] = useState<number | ''>(''); // AE to spend
  const [estimatedTokens, setEstimatedTokens] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [factoryAddr, setFactoryAddr] = useState<string | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [xPosts, setXPosts] = useState<Array<{ author?: string; handle?: string; time?: string; text: string; url?: string }>>([]);

  function parseNitterSearchText(raw: string): Array<{ author?: string; handle?: string; time?: string; text: string; url?: string }> {
    // Preserve link text while stripping URLs
    const clean = (s: string) => s
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // remove images entirely
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // keep visible text of markdown links
      .replace(/\s+/g, ' ')
      .trim();

    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

    // Segment by explicit "Post" markers if present; else by blank lines
    const segments: string[][] = [];
    let current: string[] = [];
    for (const l of lines) {
      if (/^Post$/i.test(l)) {
        if (current.length) segments.push(current), current = [];
        continue;
      }
      current.push(l);
    }
    if (current.length) segments.push(current);
    if (segments.length === 0) {
      const blocks = raw.split(/\n{2,}/).map((b) => b.split('\n').map((x) => x.trim()).filter(Boolean));
      segments.push(...blocks);
    }

    const results: Array<{ author?: string; handle?: string; time?: string; text: string; url?: string }> = [];

    for (const seg of segments) {
      // Drop obvious noise
      const filtered = seg
        .filter((l) => !/^URL Source:/i.test(l))
        .filter((l) => !/^View on X$/i.test(l))
        .filter((l) => !/(?:Retweets|Media|Videos|News|Verified|Native videos|Replies|Links|Images|Safe|Quotes|Pro videos)\s*-\s*\[[xX ]\]/i.test(l))
        .filter((l) => !/^(Top|Latest|People|Photos|Videos)$/i.test(l));

      if (filtered.length === 0) continue;

      // Extract URL if any status link exists
      let url: string | undefined;
      for (const l of filtered) {
        const m = l.match(/https?:\/\/[^\s]*\/status[^\s)]+/i);
        if (m) {
          try { const u = new URL(m[0]); url = `https://x.com${u.pathname}`; break; } catch { /* ignore */ }
        }
      }

      // Build text from the remaining human-readable lines
      const cleanedLines = filtered
        .filter((l) => !/^!\[/.test(l))
        .map(clean)
        .filter((l) => l && !/^https?:\/\//i.test(l));

      // Find handle and author heuristically
      const joined = cleanedLines.join(' ');
      const handleMatch = joined.match(/@([A-Za-z0-9_]{2,})/);
      let handle: string | undefined = handleMatch ? `@${handleMatch[1]}` : undefined;
      let author: string | undefined;
      for (let i = 0; i < cleanedLines.length; i += 1) {
        if (/@[A-Za-z0-9_]{2,}/.test(cleanedLines[i])) {
          const prev = cleanedLines[i - 1];
          if (prev && !/@/.test(prev) && prev.length <= 60) author = prev;
          break;
        }
      }

      // Extract time token
      const timeMatch = joined.match(/\b(\d+[smhd]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec\s+\d{1,2},?\s+\d{4})\b/i);
      const time = timeMatch ? timeMatch[0] : undefined;

      // Build tweet text: remove probable author/handle/time headers from the start
      const bodyLines = cleanedLines.filter((l) => !/^@/.test(l) && l !== author && l !== handle && l !== time);
      const text = clean(bodyLines.join(' ').replace(/\s*\|\s*|\s*·\s*/g, ' ').slice(0, 280));
      // Only accept if it looks like a real tweet: must have url, handle and enough text
      if (!text || !url || !handle || text.length < 20) continue;

      results.push({ author, handle, time, text, url });
    }

    return results;
  }

  useEffect(() => {
    const preset = query.get('new');
    if (preset && !name) {
      setName(preset.toUpperCase());
    }
  }, [query, name]);

  // Lazy import bctsl-sdk
  let mod: any;
  async function ensureBctsl() {
    if (!mod) mod = await import('bctsl-sdk');
    return mod;
  }

  useEffect(() => {
    (async () => {
      try {
        const schema = await (TrendminerApi as any).getFactory();
        const addr = schema?.address || null;
        setFactoryAddr(addr);
        const cols = Object.values((schema?.collections as Record<string, any>) || {});
        setCollections(cols);
        if (cols.length) setSelectedCollectionId(cols[0]?.id || null);
      } catch (e) {
        // ignore; factory not strictly required to render the form
      }
    })();
  }, []);

  // Simplified buy box calculator: sync AE <-> estimated tokens for zero initial supply
  useEffect(() => {
    try {
      const ae = Number(initialBuyVolume || 0);
      if (!isFinite(ae) || ae <= 0) { setEstimatedTokens(''); return; }
      const totalSupplyAettos = new BigNumber(0);
      const tokens = calculateTokensFromAE(totalSupplyAettos, ae);
      setEstimatedTokens(Number(tokens.toFixed(6)) || '');
    } catch {
      setEstimatedTokens('');
    }
  }, [initialBuyVolume]);

  function onChangeEstimatedTokens(v: string) {
    const num = v === '' ? '' : Number(v);
    setEstimatedTokens(num as any);
    if (v === '' || !isFinite(Number(v)) || Number(v) <= 0) {
      setInitialBuyVolume('');
      return;
    }
    try {
      const totalSupplyAettos = new BigNumber(0);
      const deltaAettos = toDecimals(Number(num || 0), 18);
      const costAettos = calculateBuyPriceWithAffiliationFee(totalSupplyAettos, deltaAettos);
      setInitialBuyVolume(toAe(costAettos));
    } catch {
      // noop fallback
    }
  }

  // Attempt to fetch top X posts for the trend name via a public read-only proxy.
  useEffect(() => {
    const controller = new AbortController();
    async function fetchX() {
      const q = (name || '').trim();
      if (!q) { setXPosts([]); return; }
      try {
        // Try multiple pages to collect at least 10 tweets
        const pages = [1, 2, 3, 4, 5];
        const all: Array<{ author?: string; handle?: string; time?: string; text: string; url?: string }> = [];
        for (const p of pages) {
          if (all.length >= 12) break;
          const url = `https://r.jina.ai/http://nitter.net/search?f=tweets&q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ''}`;
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) continue;
          const text = await res.text();
          const items = parseNitterSearchText(text);
          all.push(...items);
        }
        // Deduplicate by url
        const seen = new Set<string>();
        const uniq = all.filter((it) => {
          const key = it.url as string;
          if (!key) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setXPosts(uniq.slice(0, 10));
      } catch {
        // Silent fallback to empty; section will still show a link
        setXPosts([]);
      }
    }
    fetchX();
    return () => controller.abort();
  }, [name]);

  async function submit() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      // Preconditions
      if (!name) throw new Error('Name is required');
      const vol = Number(initialBuyVolume || 0);
      if (isNaN(vol) || vol < 0) throw new Error('Invalid initial buy volume');
      const { createCommunity } = await ensureBctsl();
      if (!factoryAddr) throw new Error('Token factory not available');
      if (!selectedCollectionId) throw new Error('Collection not available');
      // Meta info: minimal set
      const meta = new Map<string, string>();
      // eslint-disable-next-line no-console
      console.info('[create-token] Deploying community', { name, symbol, vol, factoryAddr, selectedCollectionId });
      await createCommunity(
        sdk,
        selectedCollectionId,
        {
          token: { name },
          metaInfo: meta,
          initialBuyCount: vol,
        },
        undefined,
        factoryAddr,
      );
      setSuccess('Token deployment transaction submitted. It may take a moment for the token to appear.');
    } catch (e: any) {
      setError(e?.message || 'Failed to create token');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-white mb-2">Create Your Trend (Token)</h2>
      <p className="opacity-80 text-white/80 mt-0 mb-4 leading-relaxed">Launch your trend token on the æternity blockchain with a bonding curve. You will deploy from your own wallet.</p>
      <div className="my-2">
        <WalletConnectBtn />
      </div>
      <div className="grid gap-3 mt-3">
        <div>
          <div className="text-xs opacity-70 text-white/70 uppercase tracking-wide font-semibold">FACTORY</div>
          <div className="text-xs text-white/90 font-mono">{factoryAddr || 'Loading…'}</div>
        </div>
        <div>
          <div className="text-xs opacity-70 text-white/70 uppercase tracking-wide font-semibold mb-2">TREND NAME</div>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="YOUR-TREND" 
            className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-black/30 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200" 
          />
        </div>
        <div>
          <div className="text-xs opacity-70 text-white/70 uppercase tracking-wide font-semibold mb-3">INITIAL BUY</div>
          <div className="grid gap-2">
            <label className="grid gap-1.5">
              <span className="text-xs opacity-70 text-white/70 font-medium">AE to spend</span>
              <input 
                type="number" 
                min="0" 
                step="any" 
                value={initialBuyVolume} 
                onChange={(e) => setInitialBuyVolume(e.target.value === '' ? '' : Number(e.target.value))} 
                placeholder="0.0" 
                className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-black/30 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200" 
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs opacity-70 text-white/70 font-medium">Estimated {symbol || 'TOKEN'} amount</span>
              <input 
                type="number" 
                min="0" 
                step="any" 
                value={estimatedTokens} 
                onChange={(e) => onChangeEstimatedTokens(e.target.value)} 
                placeholder="0.0" 
                className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-black/30 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200" 
              />
            </label>
          </div>
        </div>
      </div>
      {error && <div className="text-red-400 mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">{error}</div>}
      {success && <div className="text-green-400 mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">{success}</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <AeButton 
          onClick={submit} 
          disabled={busy} 
          loading={busy} 
          variant="primary" 
          size="large"
        >
          {busy ? 'Deploying…' : 'Create trend (token)'}
        </AeButton>
        <a 
          href="/trendminer/invite" 
          className="ml-2 px-4 py-2.5 rounded-full border border-white/20 bg-white text-gray-900 no-underline hover:bg-gray-100 transition-colors duration-200 font-medium"
        >
          Invite & Earn
        </a>
      </div>
      <div className="mt-6">
        <div className="text-sm font-semibold mb-2 text-white">Top posts from X</div>
        {!name && <div className="opacity-70 text-white/70">Enter a trend name to see popular posts.</div>}
        {!!name && (
          <div className="grid gap-2.5">
            {xPosts.length === 0 && (
              <div className="opacity-80 text-white/80">
                Unable to load posts. Check them directly on{' '}
                <a 
                  href={`https://x.com/search?q=${encodeURIComponent(name)}&f=top`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  X search
                </a>.
              </div>
            )}
            {xPosts.map((p, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-white/10 bg-black/20 backdrop-blur-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="font-semibold text-sm text-white">{p.author || 'Post'}</div>
                  {p.handle && <div className="opacity-70 text-xs text-white/70">{p.handle}</div>}
                  {p.time && <div className="ml-auto opacity-60 text-xs text-white/60">{p.time}</div>}
                </div>
                <div className="text-sm leading-relaxed text-white/90">{p.text}</div>
                {p.url && (
                  <div className="mt-2">
                    <a 
                      href={p.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs opacity-80 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    >
                      View on X
                    </a>
                  </div>
                )}
              </div>
            ))
          </div>
        )}
      </div>
    </div>
  );
}


