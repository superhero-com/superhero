/**
 * BondingCurveGraph
 *
 * Interactive, auto-playing bonding curve visualisation for the create-token page.
 *
 * Formula from BondingCurveExponential.aes (bcl-contracts):
 *   buy(x)  = 0.001 * (e^(0.00000001 * x) - 1) + 0.0001   [AE per token]
 *   sell(x) = buy(x) * 0.995
 *
 * The curve is intentionally flat at low supply (cheap early-adopter price)
 * and exponential at higher supply — that IS the feature, not a bug.
 * We show 0–200M tokens, where the full story plays out in practice.
 *
 * Auto-plays on mount, loops continuously.
 * User can click steps or pause/play.
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Decimal } from '@/libs/decimal';

// ── Real curve formula (matches BondingCurveExponential.aes) ─────────────────
// supply in actual token count (not aettos)
function buyPrice(supplyTokens: number): number {
  // buy(x) = 0.001 * (e^(1e-8 * x) - 1) + 0.0001
  return 0.001 * (Math.exp(1e-8 * supplyTokens) - 1) + 0.0001;
}
function sellPrice(supplyTokens: number): number {
  return buyPrice(supplyTokens) * 0.995;
}

// ── Axis ranges — 0 to 200M tokens, price in mAE ────────────────────────────
const X_MAX_M = 200; // millions of tokens
const X_MAX = X_MAX_M * 1e6;
const Y_MAX_MAE = 7; // mAE — at 200M tokens buy price ≈ 6.49 mAE

const toMae = (ae: number) => ae * 1000; // convert AE → mAE for display

// ── SVG viewport ─────────────────────────────────────────────────────────────
const W = 440;
const H = 240;
const PAD = {
  top: 20, right: 24, bottom: 42, left: 56,
};
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function svgX(xTokens: number): number {
  return PAD.left + (xTokens / X_MAX) * PLOT_W;
}
function svgY(maePrice: number): number {
  return PAD.top + PLOT_H - (Math.min(maePrice, Y_MAX_MAE) / Y_MAX_MAE) * PLOT_H;
}

// ── Path builders ─────────────────────────────────────────────────────────────
function buildBuyPath(upToTokens: number): string {
  const steps = 160;
  const end = Math.min(upToTokens, X_MAX);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * end;
    const y = toMae(buyPrice(x));
    pts.push(`${i === 0 ? 'M' : 'L'}${svgX(x).toFixed(1)},${svgY(y).toFixed(1)}`);
  }
  return pts.join(' ');
}

function buildSellPath(upToTokens: number): string {
  const steps = 160;
  const end = Math.min(upToTokens, X_MAX);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * end;
    const y = toMae(sellPrice(x));
    pts.push(`${i === 0 ? 'M' : 'L'}${svgX(x).toFixed(1)},${svgY(y).toFixed(1)}`);
  }
  return pts.join(' ');
}

function buildFill(upToTokens: number): string {
  const buyPath = buildBuyPath(upToTokens);
  const end = Math.min(upToTokens, X_MAX);
  const baseY = svgY(0).toFixed(1);
  return `${buyPath} L${svgX(end).toFixed(1)},${baseY} L${svgX(0).toFixed(1)},${baseY} Z`;
}

function buildSpreadFill(upToTokens: number): string {
  const steps = 80;
  const end = Math.min(upToTokens, X_MAX);
  const topPts: string[] = [];
  const botPts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * end;
    topPts.push(`${svgX(x).toFixed(1)},${svgY(toMae(buyPrice(x))).toFixed(1)}`);
    botPts.push(`${svgX(x).toFixed(1)},${svgY(toMae(sellPrice(x))).toFixed(1)}`);
  }
  return `M${topPts.join(' L')} L${[...botPts].reverse().join(' L')} Z`;
}

// ── Steps ────────────────────────────────────────────────────────────────────
interface Step {
  id: string;
  supplyM: number; // millions of tokens
  labelKey: string;
  descKey: string;
  color: string;
  accentClass: string;
}

const STEPS: Step[] = [
  {
    id: 'launch',
    supplyM: 0,
    labelKey: 'bondingCurve.step0Label',
    descKey: 'bondingCurve.step0Desc',
    color: '#8b5cf6',
    accentClass: 'text-purple-400',
  },
  {
    id: 'early',
    supplyM: 10,
    labelKey: 'bondingCurve.step1Label',
    descKey: 'bondingCurve.step1Desc',
    color: '#3b82f6',
    accentClass: 'text-blue-400',
  },
  {
    id: 'growth',
    supplyM: 50,
    labelKey: 'bondingCurve.step2Label',
    descKey: 'bondingCurve.step2Desc',
    color: '#06b6d4',
    accentClass: 'text-cyan-400',
  },
  {
    id: 'momentum',
    supplyM: 100,
    labelKey: 'bondingCurve.step3Label',
    descKey: 'bondingCurve.step3Desc',
    color: '#10b981',
    accentClass: 'text-emerald-400',
  },
  {
    id: 'peak',
    supplyM: 200,
    labelKey: 'bondingCurve.step4Label',
    descKey: 'bondingCurve.step4Desc',
    color: '#f59e0b',
    accentClass: 'text-amber-400',
  },
];

// ── Axis ticks ────────────────────────────────────────────────────────────────
const X_TICKS = [0, 50, 100, 150, 200]; // millions
const Y_TICKS = [0, 1, 2, 3, 5, 7]; // mAE

// ── Easing ───────────────────────────────────────────────────────────────────
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

const ANIM_MS = 1000; // per step
const HOLD_MS = 2200; // pause before advancing

// ── Component ─────────────────────────────────────────────────────────────────
const BondingCurveGraph: React.FC = () => {
  const { t } = useTranslation();
  const { getFiat, currentCurrencyInfo } = useCurrencies();
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true); // auto-play on mount
  const [animFraction, setAnimFraction] = useState(0); // 0–1 within current step
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const stepRef = useRef(stepIndex);
  const playRef = useRef(playing);

  stepRef.current = stepIndex;
  playRef.current = playing;

  const step = STEPS[stepIndex];
  const prevSupplyM = stepIndex > 0 ? STEPS[stepIndex - 1].supplyM : 0;
  const currSupplyM = step.supplyM;

  // Interpolated supply based on animation fraction
  const displaySupplyM = prevSupplyM + (currSupplyM - prevSupplyM) * easeInOutCubic(animFraction);
  const displaySupply = displaySupplyM * 1e6;
  const dotX = svgX(displaySupply);
  const dotY = svgY(toMae(buyPrice(displaySupply)));
  const currentBuyMae = toMae(buyPrice(displaySupply));
  const currentSellMae = toMae(sellPrice(displaySupply));

  // ── Animation loop ──────────────────────────────────────────────────────────
  const animate = useCallback(() => {
    startRef.current = null;
    setAnimFraction(0);

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const frac = Math.min(elapsed / ANIM_MS, 1);
      setAnimFraction(frac);

      if (frac < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Hold, then advance if still playing
        setTimeout(() => {
          if (!playRef.current) return;
          setStepIndex((prev) => {
            const next = prev + 1;
            if (next >= STEPS.length) {
              // Loop: reset to 0
              setAnimFraction(0);
              setTimeout(() => {
                if (playRef.current) animate();
              }, 0);
              return 0;
            }
            return next;
          });
        }, HOLD_MS);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start auto-play on mount
  useEffect(() => {
    animate();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-animate when stepIndex changes (from manual click)
  const prevStepRef = useRef(stepIndex);
  useEffect(() => {
    if (stepIndex === prevStepRef.current) return;
    prevStepRef.current = stepIndex;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    animate();
  }, [stepIndex, animate]);

  const handlePlayPause = useCallback(() => {
    setPlaying((v) => {
      if (!v) animate(); // resume
      return !v;
    });
  }, [animate]);

  const handleStepClick = useCallback((idx: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setStepIndex(idx);
    setAnimFraction(1);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const showCurve = displaySupplyM > 0.5;

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-[#0a0a0f] overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <h3 className="text-base font-bold text-white mb-0.5">
          {t('bondingCurve.title', { defaultValue: 'How the Bonding Curve Works' })}
        </h3>
        <p className="text-xs text-white/50">
          {t('bondingCurve.subtitle', { defaultValue: 'Early buyers get the lowest price — it rises exponentially as more join' })}
        </p>
      </div>

      {/* Chart */}
      <div className="px-2 pb-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxHeight: 230, display: 'block' }}
          aria-label={t('bondingCurve.chartAriaLabel', { defaultValue: 'Bonding curve price chart' })}
        >
          <defs>
            <linearGradient id="buyGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="spreadGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines — Y */}
          {Y_TICKS.map((maeVal) => {
            const sy = svgY(maeVal);
            return (
              <g key={`y-${maeVal}`}>
                <line
                  x1={PAD.left}
                  y1={sy}
                  x2={W - PAD.right}
                  y2={sy}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD.left - 5}
                  y={sy + 4}
                  textAnchor="end"
                  fontSize="8.5"
                  fill="rgba(255,255,255,0.3)"
                >
                  {maeVal === 0 ? '0' : `${maeVal}m`}
                </text>
              </g>
            );
          })}

          {/* Grid lines — X */}
          {X_TICKS.map((mVal) => {
            const sx = svgX(mVal * 1e6);
            const baseY = svgY(0);
            return (
              <g key={`x-${mVal}`}>
                <line
                  x1={sx}
                  y1={PAD.top}
                  x2={sx}
                  y2={baseY}
                  stroke="rgba(255,255,255,0.04)"
                  strokeDasharray="3 3"
                />
                <line x1={sx} y1={baseY} x2={sx} y2={baseY + 4} stroke="rgba(255,255,255,0.15)" />
                <text x={sx} y={baseY + 14} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.3)">
                  {mVal === 0 ? '0' : `${mVal}M`}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={PAD.left + PLOT_W / 2}
            y={H - 2}
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(255,255,255,0.35)"
          >
            {t('bondingCurve.axisSupply', { defaultValue: 'Token Supply' })}
          </text>
          <text
            x={9}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(255,255,255,0.35)"
            transform={`rotate(-90, 9, ${PAD.top + PLOT_H / 2})`}
          >
            {t('bondingCurve.axisPrice', { defaultValue: 'Price (mAE)' })}
          </text>

          {/* Ghost full buy curve */}
          <path
            d={buildBuyPath(X_MAX)}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Ghost full sell curve */}
          <path
            d={buildSellPath(X_MAX)}
            fill="none"
            stroke="rgba(16,185,129,0.08)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          {/* Fill under buy curve */}
          {showCurve && (
            <path d={buildFill(displaySupply)} fill="url(#fillGrad)" />
          )}

          {/* Spread fill between buy and sell */}
          {showCurve && displaySupplyM > 5 && (
            <path d={buildSpreadFill(displaySupply)} fill="url(#spreadGrad)" />
          )}

          {/* Animated sell curve */}
          {showCurve && (
            <path
              d={buildSellPath(displaySupply)}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              opacity="0.5"
            />
          )}

          {/* Animated buy curve */}
          {showCurve && (
            <path
              d={buildBuyPath(displaySupply)}
              fill="none"
              stroke="url(#buyGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          )}

          {/* Vertical drop line */}
          {showCurve && (
            <line
              x1={dotX}
              y1={dotY}
              x2={dotX}
              y2={svgY(0)}
              stroke={step.color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
          )}

          {/* Dot on buy curve */}
          {showCurve && (
            <g filter="url(#glow)">
              <circle cx={dotX} cy={dotY} r="7" fill={step.color} opacity="0.2" />
              <circle cx={dotX} cy={dotY} r="4" fill={step.color} />
              <circle cx={dotX} cy={dotY} r="1.8" fill="white" />
            </g>
          )}

          {/* Price callout — buy */}
          {showCurve && currentBuyMae < Y_MAX_MAE * 0.92 && (
            <g>
              <rect
                x={dotX + 8}
                y={dotY - 13}
                width={72}
                height={15}
                rx="3"
                fill="#0a0a0f"
                stroke={step.color}
                strokeWidth="0.7"
                opacity="0.95"
              />
              <text x={dotX + 12} y={dotY - 2} fontSize="8.5" fill={step.color} fontWeight="700">
                {getFiat(Decimal.from(currentBuyMae / 1000))?.gt(Decimal.ZERO)
                  ? `${currentCurrencyInfo?.symbol ?? '$'}${Number(getFiat(Decimal.from(currentBuyMae / 1000))?.toString()).toLocaleString(undefined, { maximumFractionDigits: 5 })}`
                  : `${currentBuyMae.toFixed(3)} mAE`}
              </text>
            </g>
          )}

          {/* Spread label */}
          {showCurve && displaySupplyM > 20 && displaySupplyM < 180 && (
            <g>
              <text
                x={dotX - 6}
                y={svgY((currentBuyMae + currentSellMae) / 2) + 3}
                fontSize="7.5"
                fill="#10b981"
                opacity="0.6"
                textAnchor="end"
              >
                −0.5%
              </text>
            </g>
          )}

          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={svgY(0)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <line x1={PAD.left} y1={svgY(0)} x2={W - PAD.right} y2={svgY(0)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        </svg>
      </div>

      {/* Live stats row */}
      <div className="flex gap-3 px-5 pb-3">
        <div
          className="flex-1 rounded-xl px-3 py-2 text-center"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
        >
          <p className="text-[9px] text-white/40 uppercase tracking-wider">Supply</p>
          <p className="text-sm font-bold text-white mt-0.5">
            {displaySupplyM < 1
              ? `${((displaySupplyM * 1e6) / 1e3).toFixed(1)}K`
              : `${displaySupplyM.toFixed(1)}M`}
          </p>
        </div>
        <div
          className="flex-1 rounded-xl px-3 py-2 text-center"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          <p className="text-[9px] text-white/40 uppercase tracking-wider">Buy price</p>
          <p className="text-sm font-bold text-blue-300 mt-0.5">
            {getFiat(Decimal.from(currentBuyMae / 1000))?.gt(Decimal.ZERO)
              ? `${currentCurrencyInfo?.symbol ?? '$'}${Number(getFiat(Decimal.from(currentBuyMae / 1000))?.toString()).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`
              : `${currentBuyMae.toFixed(4)} mAE`}
          </p>
        </div>
        <div
          className="flex-1 rounded-xl px-3 py-2 text-center"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
        >
          <p className="text-[9px] text-white/40 uppercase tracking-wider">Sell price</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">
            {getFiat(Decimal.from(currentSellMae / 1000))?.gt(Decimal.ZERO)
              ? `${currentCurrencyInfo?.symbol ?? '$'}${Number(getFiat(Decimal.from(currentSellMae / 1000))?.toString()).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`
              : `${currentSellMae.toFixed(4)} mAE`}
          </p>
        </div>
      </div>

      {/* Step description */}
      <div className="px-5 pb-4">
        <div
          className="rounded-xl p-3.5 transition-all duration-500"
          style={{ background: `${step.color}10`, border: `1px solid ${step.color}25` }}
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${step.accentClass}`}>
            {t(step.labelKey, { defaultValue: `Step ${stepIndex + 1}` })}
          </p>
          <p className="text-xs text-white/75 leading-relaxed">
            {t(step.descKey, { defaultValue: '' })}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 pb-5 flex items-center justify-between">
        {/* Step dots */}
        <div className="flex gap-1.5">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleStepClick(idx)}
              aria-label={`Step ${idx + 1}`}
              className="rounded-full border-0 p-0 cursor-pointer transition-all duration-300"
              style={{
                width: idx === stepIndex ? 18 : 6,
                height: 6,
                background: idx === stepIndex ? step.color : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="flex items-center gap-1.5 px-3 h-7 rounded-full text-white text-xs font-semibold border-0 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            boxShadow: '0 0 12px rgba(139,92,246,0.35)',
          }}
        >
          {playing ? (
            <>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <rect x="1" y="1" width="2.5" height="7" rx="0.5" fill="white" />
                <rect x="5.5" y="1" width="2.5" height="7" rx="0.5" fill="white" />
              </svg>
              {t('bondingCurve.pause', { defaultValue: 'Pause' })}
            </>
          ) : (
            <>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 1.5l6 3-6 3V1.5z" fill="white" />
              </svg>
              {t('bondingCurve.play', { defaultValue: 'Play' })}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BondingCurveGraph;
