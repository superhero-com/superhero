import React, { useEffect, useMemo, useState } from 'react';
import WalletConnectBtn from '../../components/WalletConnectBtn';
import { useLocation } from 'react-router-dom';
import { AeSdk } from '@aeternity/aepp-sdk';
import { TrendminerApi } from '../../api/backend';
import AeButton from '../../components/AeButton';
import BigNumber from 'bignumber.js';
import { calculateBuyPriceWithAffiliationFee, calculateTokensFromAE, toAe, toDecimals } from '../../utils/bondingCurve';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function CreateToken() {
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
      const sdk: any = (window as any).__aeSdk as AeSdk;
      if (!sdk) throw new Error('Connect your wallet first');
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem' }}>
      <h2 style={{ marginBottom: 8 }}>Create Your Trend (Token)</h2>
      <p style={{ opacity: 0.8, marginTop: 0 }}>Launch your trend token on the æternity blockchain with a bonding curve. You will deploy from your own wallet.</p>
      <div style={{ margin: '8px 0' }}>
        <WalletConnectBtn />
      </div>
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>FACTORY</div>
          <div style={{ fontSize: 12 }}>{factoryAddr || 'Loading…'}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>TREND NAME</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="YOUR-TREND" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>INITIAL BUY</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>AE to spend</span>
              <input type="number" min="0" step="any" value={initialBuyVolume} onChange={(e) => setInitialBuyVolume(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Estimated {symbol || 'TOKEN'} amount</span>
              <input type="number" min="0" step="any" value={estimatedTokens} onChange={(e) => onChangeEstimatedTokens(e.target.value)} placeholder="0.0" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)' }} />
            </label>
          </div>
        </div>
      </div>
      {error && <div style={{ color: 'tomato', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
      <div style={{ marginTop: 16 }}>
        <AeButton onClick={submit} disabled={busy} loading={busy} variant="primary" size="large">{busy ? 'Deploying…' : 'Create trend (token)'}</AeButton>
        <a href="/trendminer/invite" style={{ marginLeft: 8, padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#111', textDecoration: 'none' }}>Invite & Earn</a>
      </div>
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Top posts from X</div>
        {!name && <div style={{ opacity: 0.7 }}>Enter a trend name to see popular posts.</div>}
        {!!name && (
          <div style={{ display: 'grid', gap: 10 }}>
            {xPosts.length === 0 && (
              <div style={{ opacity: 0.8 }}>
                Unable to load posts. Check them directly on <a href={`https://x.com/search?q=${encodeURIComponent(name)}&f=top`} target="_blank" rel="noreferrer">X search</a>.
              </div>
            )}
            {xPosts.map((p, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.author || 'Post'}</div>
                  {p.handle && <div style={{ opacity: 0.7, fontSize: 12 }}>{p.handle}</div>}
                  {p.time && <div style={{ marginLeft: 'auto', opacity: 0.6, fontSize: 12 }}>{p.time}</div>}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>{p.text}</div>
                {p.url && (
                  <div style={{ marginTop: 8 }}>
                    <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, opacity: 0.8 }}>View on X</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


