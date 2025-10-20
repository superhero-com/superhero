import React, { useEffect, useMemo, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import TrendCloudVisx from './TrendCloudVisx';
import MobileCard from '../../components/MobileCard';
import MobileInput from '../../components/MobileInput';

type TrendingTag = { tag: string; score: number; source?: string };

type ScaleType = 'linear' | 'sqrt' | 'log';
type OrderType = 'score' | 'alpha' | 'random';
type PaletteType = 'default' | 'warm' | 'cool' | 'mono' | 'category10';
type WeightSource = 'score' | 'market_cap';

function hashStringToSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function TrendCloud() {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters / search
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(120);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [onlyTokenized, setOnlyTokenized] = useState(false);
  const [includeTokens, setIncludeTokens] = useState(true);

  // Config similar to demo + trend-specific
  const [minFont, setMinFont] = useState(12);
  const [maxFont, setMaxFont] = useState(56);
  const [scaleType, setScaleType] = useState<ScaleType>('linear');
  const [weighting, setWeighting] = useState<'score' | 'log'>('score');
  const [order, setOrder] = useState<OrderType>('score');
  const [palette, setPalette] = useState<PaletteType>('default');
  const [gap, setGap] = useState(8);
  const [textCase, setTextCase] = useState<'upper' | 'lower' | 'capitalize'>('upper');
  const [rotations, setRotations] = useState(3);
  const [rotationRange, setRotationRange] = useState(60); // degrees +/-
  const [seed, setSeed] = useState('trend');
  const [weightSource, setWeightSource] = useState<WeightSource>('market_cap');
  const [view, setView] = useState<'cloud' | 'visx' | 'grid'>('cloud');
  const [showConfig, setShowConfig] = useState(false);

  const palettes: Record<PaletteType, string[]> = {
    default: ['#111'],
    mono: ['#111', '#333', '#555'],
    warm: ['#d9480f', '#f59f00', '#f76707', '#e8590c', '#ffa94d'],
    cool: ['#1864ab', '#228be6', '#3bc9db', '#15aabf', '#5c7cfa'],
    category10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await TrendminerApi.listTrendingTags({ orderBy: 'score', orderDirection: 'DESC', limit: 500, page: 1 });
        const items = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        const mapped: TrendingTag[] = items.map((it: any) => ({ tag: it.tag ?? it.name ?? '', score: Number(it.score ?? it.value ?? 0), source: it.source || it.platform || undefined }));
        if (!cancelled) setTags(mapped.filter((t) => t.tag));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load trending tags');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load tokens list to optionally include them as words
  const [tokenItems, setTokenItems] = useState<Array<{ address: string; name?: string; market_cap?: number; holders_count?: number; price?: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadTokens() {
      try {
        const resp = await TrendminerApi.listTokens({ orderBy: 'market_cap' as any, orderDirection: 'DESC', limit: 300, page: 1 });
        const items: any[] = resp?.items ?? resp ?? [];
        if (!cancelled) setTokenItems(items.map((t) => ({ address: t.address, name: t.name, market_cap: Number(t.market_cap ?? 0), holders_count: Number(t.holders_count ?? 0), price: Number(t.price ?? 0) })));
      } catch {
        if (!cancelled) setTokenItems([]);
      }
    }
    loadTokens();
    return () => { cancelled = true; };
  }, []);

  // Create a map of token names to their market caps for weighting
  const tokenCapMap = useMemo(() => {
    const map = new Map<string, number>();
    tokenItems.forEach((t) => {
      if (t.name) map.set(t.name.toLowerCase(), t.market_cap || 0);
    });
    return map;
  }, [tokenItems]);

  // Create a map of tag names to token data for quick lookup
  const tagTokenMap = useMemo(() => {
    const map: Record<string, any> = {};
    tokenItems.forEach((t) => {
      if (t.name) map[t.name.toLowerCase()] = t;
    });
    return map;
  }, [tokenItems]);

  // Filter and order tags
  const filteredTags = useMemo(() => {
    let filtered = tags;
    
    // Apply search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((t) => t.tag.toLowerCase().includes(q));
    }
    
    // Apply source filter
    if (sourceFilter) {
      filtered = filtered.filter((t) => t.source === sourceFilter);
    }
    
    // Apply tokenized filter
    if (onlyTokenized) {
      filtered = filtered.filter((t) => tagTokenMap[t.tag.toLowerCase()]);
    }
    
    // Apply limit
    filtered = filtered.slice(0, limit);
    
    // Apply ordering
    if (order === 'alpha') {
      filtered = [...filtered].sort((a, b) => a.tag.localeCompare(b.tag));
    } else if (order === 'random') {
      const r = mulberry32(hashStringToSeed(seed));
      filtered = [...filtered].sort(() => r() - 0.5);
    } else {
      // score order (default)
      filtered = [...filtered].sort((a, b) => b.score - a.score);
    }
    
    return filtered;
  }, [tags, search, sourceFilter, onlyTokenized, limit, order, seed, tagTokenMap]);

  // Get unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    tags.forEach((t) => {
      if (t.source) sources.add(t.source);
    });
    return Array.from(sources).sort();
  }, [tags]);

  // Add tokens to the list if enabled
  const orderedTags = useMemo(() => {
    if (!includeTokens) return filteredTags;
    
    const tokenTags: TrendingTag[] = tokenItems
      .filter((t) => t.name && !filteredTags.some((ft) => ft.tag.toLowerCase() === t.name?.toLowerCase()))
      .map((t) => ({ tag: t.name!, score: t.market_cap || 0, source: 'token' }));
    
    return [...filteredTags, ...tokenTags.slice(0, Math.max(0, limit - filteredTags.length))];
  }, [filteredTags, includeTokens, tokenItems, limit]);

  function getValueForWeight(t: TrendingTag): number {
    if (weightSource === 'market_cap') {
      const v = tokenCapMap.get(t.tag);
      if (v != null && Number.isFinite(v)) return v;
    }
    return t.score;
  }

  const [minValue, maxValue] = useMemo(() => {
    const values = filteredTags.map((t) => getValueForWeight(t)).filter((n) => Number.isFinite(n));
    if (!values.length) return [0, 1] as const;
    return [Math.min(...values), Math.max(...values)] as const;
  }, [filteredTags, weightSource, tokenCapMap]);

  function scaleValue(value: number): number {
    const s = weighting === 'log' ? Math.log(value + 1) : value;
    const minS = weighting === 'log' ? Math.log(minValue + 1) : minValue;
    const maxS = weighting === 'log' ? Math.log(maxValue + 1) : maxValue;
    if (maxS === minS) return 0.5;
    const x = (s - minS) / (maxS - minS);
    if (scaleType === 'sqrt') return Math.sqrt(Math.max(0, x));
    if (scaleType === 'log') return Math.log(1 + 9 * Math.max(0, x)) / Math.log(10);
    return Math.max(0, x);
  }

  function getFontPx(value: number): number {
    const t = scaleValue(value);
    return Math.round(minFont + t * (maxFont - minFont));
  }

  function getRotationDeg(tagKey: string): number {
    if (rotations <= 0 || rotationRange <= 0) return 0;
    const r = mulberry32(hashStringToSeed(`${seed}:${tagKey}`));
    if (rotations === 1) return Math.round((r() * 2 - 1) * rotationRange);
    const step = (rotationRange * 2) / (rotations - 1);
    const idx = Math.floor(r() * rotations);
    return Math.round(-rotationRange + step * idx);
  }

  function getColor(tagKey: string): string {
    const paletteArr = palettes[palette] || palettes.default;
    const r = mulberry32(hashStringToSeed(`${seed}|${tagKey}`));
    const idx = Math.floor(r() * paletteArr.length);
    return paletteArr[idx];
  }

  const [hovered, setHovered] = useState<{ tag: TrendingTag; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<TrendingTag | null>(null);

  return (
    <div className="max-w-[min(1200px,100%)] mx-auto p-5 md:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-5">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white m-0 mb-2">
            TrendCloud
          </h1>
          <p className="text-sm text-white/75 opacity-75 m-0 leading-relaxed">
            Interactive word cloud of trending tags. Click a word to view its token (if available) or start tokenizing it.
          </p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 bg-black/20 border border-white/20 rounded-xl p-1">
            <button 
              onClick={() => setView('cloud')} 
              className={`px-4 py-2 rounded-lg border-0 text-sm font-medium cursor-pointer transition-all duration-200 min-h-9 ${
                view === 'cloud' 
                  ? 'bg-white text-black shadow-md' 
                  : 'bg-transparent text-white hover:bg-white/20'
              }`}
            >
              Cloud
            </button>
            <button 
              onClick={() => setView('visx')} 
              className={`px-4 py-2 rounded-lg border-0 text-sm font-medium cursor-pointer transition-all duration-200 min-h-9 ${
                view === 'visx' 
                  ? 'bg-white text-black shadow-md' 
                  : 'bg-transparent text-white hover:bg-white/20'
              }`}
            >
              Visx
            </button>
            <button 
              onClick={() => setView('grid')} 
              className={`px-4 py-2 rounded-lg border-0 text-sm font-medium cursor-pointer transition-all duration-200 min-h-9 ${
                view === 'grid' 
                  ? 'bg-white text-black shadow-md' 
                  : 'bg-transparent text-white hover:bg-white/20'
              }`}
            >
              Grid
            </button>
          </div>
          
          <div className="flex gap-3 items-center flex-col md:flex-row">
            <MobileInput
              placeholder="Search words..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="medium"
              variant="filled"
              className="flex-1 min-w-48 w-full md:w-auto"
            />
            
            <select 
              value={sourceFilter} 
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-white/20 bg-white text-black text-sm font-medium cursor-pointer transition-all duration-200 min-w-36 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="">All Sources</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-4 items-center flex-wrap">
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input 
                type="checkbox" 
                checked={onlyTokenized} 
                onChange={(e) => setOnlyTokenized(e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span>Only tokenized</span>
            </label>
            
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input 
                type="checkbox" 
                checked={includeTokens} 
                onChange={(e) => setIncludeTokens(e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span>Include tokens</span>
            </label>
            
            <a 
              href="/trends/tokens" 
              className="px-4 py-2 rounded-xl border border-white/20 bg-white text-black no-underline text-sm font-medium transition-all duration-200 min-h-9 flex items-center justify-center hover:bg-gray-100 hover:border-white/40 hover:-translate-y-0.5"
            >
              View Tokens
            </a>
          </div>
        </div>
      </div>

      {/* Config Panel */}
      <MobileCard variant="elevated" padding="medium" className="config-panel">
        <div className="config-header">
          <h3 className="config-title">Configuration</h3>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="config-toggle"
          >
            {showConfig ? 'Hide' : 'Show'} Settings
          </button>
        </div>
        
        {showConfig && (
          <div className="config-grid">
            <div className="config-item">
              <label className="config-label">Words Limit</label>
              <div className="config-control">
                <input 
                  type="range" 
                  min={20} 
                  max={300} 
                  value={limit} 
                  onChange={(e) => setLimit(Number(e.target.value))} 
                  className="config-range"
                />
                <span className="config-value">{limit}</span>
              </div>
            </div>
            
            <div className="config-item">
              <label className="config-label">Min Font</label>
              <div className="config-control">
                <input 
                  type="range" 
                  min={8} 
                  max={40} 
                  value={minFont} 
                  onChange={(e) => setMinFont(Number(e.target.value))} 
                  className="config-range"
                />
                <span className="config-value">{minFont}</span>
              </div>
            </div>
            
            <div className="config-item">
              <label className="config-label">Max Font</label>
              <div className="config-control">
                <input 
                  type="range" 
                  min={24} 
                  max={96} 
                  value={maxFont} 
                  onChange={(e) => setMaxFont(Number(e.target.value))} 
                  className="config-range"
                />
                <span className="config-value">{maxFont}</span>
              </div>
            </div>
            
            <div className="config-item">
              <label className="config-label">Scale Type</label>
              <select 
                value={scaleType} 
                onChange={(e) => setScaleType(e.target.value as ScaleType)}
                className="config-select"
              >
                <option value="linear">Linear</option>
                <option value="sqrt">Sqrt</option>
                <option value="log">Log</option>
              </select>
            </div>
            
            <div className="config-item">
              <label className="config-label">Weighting</label>
              <select 
                value={weighting} 
                onChange={(e) => setWeighting(e.target.value as any)}
                className="config-select"
              >
                <option value="score">Score</option>
                <option value="log">log(score+1)</option>
              </select>
            </div>
            
            <div className="config-item">
              <label className="config-label">Weight By</label>
              <select 
                value={weightSource} 
                onChange={(e) => setWeightSource(e.target.value as WeightSource)}
                className="config-select"
              >
                <option value="market_cap">Market cap</option>
                <option value="score">Trending score</option>
              </select>
            </div>
            
            <div className="config-item">
              <label className="config-label">Order</label>
              <select 
                value={order} 
                onChange={(e) => setOrder(e.target.value as OrderType)}
                className="config-select"
              >
                <option value="score">Score</option>
                <option value="alpha">Alphabetical</option>
                <option value="random">Random</option>
              </select>
            </div>
            
            <div className="config-item">
              <label className="config-label">Palette</label>
              <select 
                value={palette} 
                onChange={(e) => setPalette(e.target.value as PaletteType)}
                className="config-select"
              >
                <option value="default">Default</option>
                <option value="mono">Mono</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
                <option value="category10">Category10</option>
              </select>
            </div>
            
            <div className="config-item">
              <label className="config-label">Word Gap</label>
              <div className="config-control">
                <input 
                  type="range" 
                  min={0} 
                  max={24} 
                  value={gap} 
                  onChange={(e) => setGap(Number(e.target.value))} 
                  className="config-range"
                />
                <span className="config-value">{gap}</span>
              </div>
            </div>
            
            <div className="config-item">
              <label className="config-label">Text Case</label>
              <select 
                value={textCase} 
                onChange={(e) => setTextCase(e.target.value as any)}
                className="config-select"
              >
                <option value="upper">UPPER</option>
                <option value="capitalize">Capitalize</option>
                <option value="lower">lower</option>
              </select>
            </div>
            
            <div className="config-item">
              <label className="config-label">Rotations</label>
              <select 
                value={rotations} 
                onChange={(e) => setRotations(Number(e.target.value))}
                className="config-select"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
              </select>
            </div>
            
            <div className="config-item">
              <label className="config-label">Rotation Range ±{rotationRange}°</label>
              <div className="config-control">
                <input 
                  type="range" 
                  min={0} 
                  max={90} 
                  value={rotationRange} 
                  onChange={(e) => setRotationRange(Number(e.target.value))} 
                  className="config-range"
                />
                <span className="config-value">{rotationRange}°</span>
              </div>
            </div>
            
            <div className="config-item">
              <label className="config-label">Seed</label>
              <input 
                value={seed} 
                onChange={(e) => setSeed(e.target.value)}
                className="config-input"
                placeholder="Enter seed..."
              />
            </div>
          </div>
        )}
      </MobileCard>

      {/* Loading and Error States */}
      {loading && (
        <div className="trend-cloud-loading">
          <div className="loading-spinner" />
          <span>Loading trends...</span>
        </div>
      )}
      
      {error && (
        <div className="trend-cloud-error">
          {error}
        </div>
      )}

      {/* Cloud View */}
      {view === 'cloud' && !loading && !error && (
        <MobileCard variant="elevated" padding="medium" className="cloud-container">
          <div
            aria-label="Trend word cloud"
            className="word-cloud"
            onMouseLeave={() => setHovered(null)}
          >
            {filteredTags.map((t) => {
              const token = tagTokenMap[t.tag];
              const href = token ? `/trends/tokens/${encodeURIComponent(token.name || token.address || t.tag)}` : `/trends/create?new=${encodeURIComponent(t.tag)}`;
              let text = t.tag;
              if (textCase === 'upper') text = text.toUpperCase();
              else if (textCase === 'lower') text = text.toLowerCase();
              else text = text.charAt(0).toUpperCase() + text.slice(1);
              const weightVal = getValueForWeight(t);
              const fontSize = getFontPx(weightVal);
              const rotation = getRotationDeg(t.tag);
              const color = getColor(t.tag);
              
              return (
                <a
                  key={t.tag}
                  href={href}
                  onMouseMove={(e) => setHovered({ tag: t, x: e.clientX, y: e.clientY })}
                  onMouseEnter={(e) => setHovered({ tag: t, x: e.clientX, y: e.clientY })}
                  onFocus={() => setSelected(t)}
                  onClick={() => setSelected(t)}
                  className="cloud-word"
                  style={{
                    fontSize: `${fontSize}px`,
                    color,
                    transform: `rotate(${rotation}deg)`,
                    filter: selected?.tag === t.tag ? 'drop-shadow(0 0 2px rgba(0,0,0,0.2))' : undefined,
                  }}
                >
                  {text}
                </a>
              );
            })}
          </div>
          
          {hovered && (
            <div
              className="hover-tooltip"
              style={{
                top: hovered.y + 14,
                left: hovered.x + 10,
              }}
            >
              <div className="tooltip-title">{hovered.tag.tag}</div>
              <div className="tooltip-score">
                Score: {hovered.tag.score.toLocaleString()} {hovered.tag.source ? `(via ${hovered.tag.source})` : ''}
              </div>
              {tagTokenMap[hovered.tag.tag] ? (
                <div className="tooltip-status">Tokenized ✓</div>
              ) : (
                <div className="tooltip-status">Not tokenized</div>
              )}
            </div>
          )}
        </MobileCard>
      )}

      {/* Visx View */}
      {view === 'visx' && !loading && !error && (
        <MobileCard variant="elevated" padding="medium" className="visx-container">
          <TrendCloudVisx embedded width={1100} height={520} />
        </MobileCard>
      )}

      {/* Grid View */}
      {view === 'grid' && !loading && !error && (
        <div className="grid-container">
          {filteredTags.map((t) => (
            <MobileCard
              key={t.tag}
              variant="elevated"
              padding="medium"
              clickable
              className="grid-item"
            >
              <a 
                href={tagTokenMap[t.tag] ? `/trends/tokens/${encodeURIComponent(tagTokenMap[t.tag].name || tagTokenMap[t.tag].address || t.tag)}` : `/trends/create?new=${encodeURIComponent(t.tag)}`}
                className="grid-link"
              >
                <div className="grid-title">{t.tag.toUpperCase()}</div>
                <div className="grid-score">Score: {t.score.toLocaleString()}</div>
                <div className="grid-source">Source: {t.source || '—'}</div>
                {tagTokenMap[t.tag] ? (
                  <div className="grid-status tokenized">Tokenized ✓</div>
                ) : (
                  <div className="grid-status not-tokenized">Not tokenized</div>
                )}
              </a>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Selected Item Details */}
      {selected && (
        <MobileCard variant="elevated" padding="medium" className="selected-details">
          <div className="selected-header">
            <h3 className="selected-title">{selected.tag.toUpperCase()}</h3>
            <div className="selected-score">
              score {selected.score.toLocaleString()} {selected.source ? `(via ${selected.source})` : ''}
            </div>
          </div>
          
          <div className="selected-actions">
            {tagTokenMap[selected.tag] ? (
              <a 
                href={`/trends/tokens/${encodeURIComponent(tagTokenMap[selected.tag].name || tagTokenMap[selected.tag].address || selected.tag)}`}
                className="action-btn primary"
              >
                View token
              </a>
            ) : (
              <a 
                href={`/trends/create?new=${encodeURIComponent(selected.tag)}`}
                className="action-btn primary"
              >
                Tokenize
              </a>
            )}
            <a 
              href={`https://x.com/search?q=${encodeURIComponent('#' + selected.tag)}&src=typed_query`}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn secondary"
            >
              Search on X
            </a>
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(selected.tag + ' trend')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn secondary"
            >
              Web search
            </a>
          </div>
        </MobileCard>
      )}

      {/* Footer */}
      <div className="trend-cloud-footer">
        Word cloud inspiration: see demo at{' '}
        <a 
          href="https://react-word-cloud-demo.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="footer-link"
        >
          react word cloud demo
        </a>.
      </div>
    </div>
  );
}


