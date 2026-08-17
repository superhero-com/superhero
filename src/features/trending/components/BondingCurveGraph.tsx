/**
 * BondingCurveGraph
 *
 * Interactive, step-by-step animated explanation of the Superhero bonding curve.
 * Uses the real curve formula: price = a·eˢ·supply − c (same constants as bondingCurve.ts).
 *
 * No external animation library — pure CSS transitions + SVG path animation.
 * Steps auto-advance with a "play" button, or the user can step manually.
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';

// ── Curve constants (mirrors src/utils/bondingCurve.ts) ──────────────────────
const A = 0.001;
const K = 0.00000001;
const C = 0.0009999;

/** price(x) in normalised AE units (x = token supply in millions) */
const price = (x: number): number => Math.max(0, A * Math.exp(K * x * 1e6) - C);

// ── SVG viewport ─────────────────────────────────────────────────────────────
const W = 420;
const H = 240;
const PAD = {
  top: 20, right: 20, bottom: 40, left: 52,
};
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const X_MAX = 800; // supply in millions of tokens
const Y_MAX = 0.012; // max price in AE

const toSvgX = (x: number) => PAD.left + (x / X_MAX) * PLOT_W;
const toSvgY = (y: number) => PAD.top + PLOT_H - (y / Y_MAX) * PLOT_H;

function buildPath(upToX: number): string {
  const steps = 120;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * Math.min(upToX, X_MAX);
    const y = price(x);
    const sx = toSvgX(x);
    const sy = toSvgY(Math.min(y, Y_MAX));
    pts.push(`${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  return pts.join(' ');
}

// ── Gradient fill path (curve + baseline) ────────────────────────────────────
function buildFill(upToX: number): string {
  const curve = buildPath(upToX).replace(/^M/, 'M');
  const lastX = toSvgX(Math.min(upToX, X_MAX)).toFixed(1);
  const baseY = toSvgY(0).toFixed(1);
  return `${curve} L${lastX},${baseY} L${toSvgX(0).toFixed(1)},${baseY} Z`;
}

// ── Steps definition ─────────────────────────────────────────────────────────
interface Step {
  id: string;
  supplyFraction: number; // 0–1, how far along X the animated marker is
  labelKey: string;
  descKey: string;
  color: string;
  accentClass: string;
}

const STEPS: Step[] = [
  {
    id: 'origin',
    supplyFraction: 0,
    labelKey: 'bondingCurve.step0Label',
    descKey: 'bondingCurve.step0Desc',
    color: '#8b5cf6',
    accentClass: 'text-purple-400',
  },
  {
    id: 'early',
    supplyFraction: 0.1,
    labelKey: 'bondingCurve.step1Label',
    descKey: 'bondingCurve.step1Desc',
    color: '#3b82f6',
    accentClass: 'text-blue-400',
  },
  {
    id: 'growth',
    supplyFraction: 0.35,
    labelKey: 'bondingCurve.step2Label',
    descKey: 'bondingCurve.step2Desc',
    color: '#06b6d4',
    accentClass: 'text-cyan-400',
  },
  {
    id: 'momentum',
    supplyFraction: 0.65,
    labelKey: 'bondingCurve.step3Label',
    descKey: 'bondingCurve.step3Desc',
    color: '#10b981',
    accentClass: 'text-emerald-400',
  },
  {
    id: 'peak',
    supplyFraction: 1,
    labelKey: 'bondingCurve.step4Label',
    descKey: 'bondingCurve.step4Desc',
    color: '#f59e0b',
    accentClass: 'text-amber-400',
  },
];

// ── Y-axis labels ─────────────────────────────────────────────────────────────
const Y_TICKS = [0, 0.003, 0.006, 0.009, 0.012];

// ── X-axis labels ─────────────────────────────────────────────────────────────
const X_TICKS = [0, 200, 400, 600, 800];

// ── Component ─────────────────────────────────────────────────────────────────

const BondingCurveGraph: React.FC = () => {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animatedFraction, setAnimatedFraction] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const ANIM_DURATION = 800; // ms per step transition

  const step = STEPS[stepIndex];
  const targetFraction = step.supplyFraction;

  // Animate fraction toward targetFraction
  useEffect(() => {
    const fromFraction = animatedFraction;
    const toFraction = targetFraction;
    if (Math.abs(fromFraction - toFraction) < 0.001) return undefined;

    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t2 = Math.min(elapsed / ANIM_DURATION, 1);
      // ease out cubic
      const eased = 1 - (1 - t2) ** 3;
      setAnimatedFraction(fromFraction + (toFraction - fromFraction) * eased);
      if (t2 < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // intentionally only trigger when targetFraction changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFraction]);

  // Auto-play
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => {
      if (stepIndex < STEPS.length - 1) {
        setStepIndex((i) => i + 1);
      } else {
        setPlaying(false);
      }
    }, ANIM_DURATION + 1800);
    return () => clearTimeout(timer);
  }, [playing, stepIndex]);

  const handlePlay = useCallback(() => {
    if (stepIndex === STEPS.length - 1) {
      setStepIndex(0);
      setAnimatedFraction(0);
    }
    setPlaying(true);
  }, [stepIndex]);

  const handlePause = useCallback(() => setPlaying(false), []);

  const handleStep = useCallback((idx: number) => {
    setPlaying(false);
    setStepIndex(idx);
  }, []);

  // Derived SVG values
  const supplyX = animatedFraction * X_MAX;
  const priceY = price(supplyX);
  const dotX = toSvgX(supplyX);
  const dotY = toSvgY(Math.min(priceY, Y_MAX));
  const curvePath = buildPath(supplyX);
  const fillPath = buildFill(supplyX);

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-[#0a0a0f] overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-base font-bold text-white mb-0.5">
          {t('bondingCurve.title', { defaultValue: 'How the Bonding Curve Works' })}
        </h3>
        <p className="text-xs text-white/50">
          {t('bondingCurve.subtitle', { defaultValue: 'Price rises automatically as more tokens are bought' })}
        </p>
      </div>

      {/* SVG Chart */}
      <div className="px-3 pb-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxHeight: 220, display: 'block' }}
          aria-label={t('bondingCurve.chartAriaLabel', { defaultValue: 'Bonding curve price chart' })}
        >
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Full ghost curve behind */}
            <path id="ghostCurve" d={buildPath(X_MAX)} />
          </defs>

          {/* Y-axis grid lines + labels */}
          {Y_TICKS.map((val) => {
            const sy = toSvgY(val);
            return (
              <g key={`ytick-${val}`}>
                <line
                  x1={PAD.left}
                  y1={sy}
                  x2={W - PAD.right}
                  y2={sy}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD.left - 4}
                  y={sy + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="rgba(255,255,255,0.3)"
                >
                  {val === 0 ? '0' : `${(val * 1000).toFixed(0)}m`}
                </text>
              </g>
            );
          })}

          {/* X-axis ticks + labels */}
          {X_TICKS.map((val) => {
            const sx = toSvgX(val);
            const baseY = toSvgY(0);
            return (
              <g key={`xtick-${val}`}>
                <line
                  x1={sx}
                  y1={baseY}
                  x2={sx}
                  y2={baseY + 4}
                  stroke="rgba(255,255,255,0.2)"
                />
                <text
                  x={sx}
                  y={baseY + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(255,255,255,0.3)"
                >
                  {val === 0 ? '0' : `${val}M`}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={PAD.left + PLOT_W / 2}
            y={H - 2}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.4)"
          >
            {t('bondingCurve.axisSupply', { defaultValue: 'Token Supply' })}
          </text>
          <text
            x={10}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.4)"
            transform={`rotate(-90, 10, ${PAD.top + PLOT_H / 2})`}
          >
            {t('bondingCurve.axisPrice', { defaultValue: 'Price (AE)' })}
          </text>

          {/* Ghost curve (full, dimmed) */}
          <path
            d={buildPath(X_MAX)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Fill area under animated curve */}
          {animatedFraction > 0.01 && (
            <path
              d={fillPath}
              fill="url(#curveGrad)"
            />
          )}

          {/* Animated curve stroke */}
          {animatedFraction > 0.01 && (
            <path
              d={curvePath}
              fill="none"
              stroke="url(#strokeGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          )}

          {/* Vertical drop line from dot to x-axis */}
          {animatedFraction > 0.01 && (
            <line
              x1={dotX}
              y1={dotY}
              x2={dotX}
              y2={toSvgY(0)}
              stroke={step.color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          )}

          {/* Dot on curve */}
          {animatedFraction > 0 && (
            <g filter="url(#glow)">
              <circle cx={dotX} cy={dotY} r="6" fill={step.color} opacity="0.25" />
              <circle cx={dotX} cy={dotY} r="3.5" fill={step.color} />
              <circle cx={dotX} cy={dotY} r="1.5" fill="white" />
            </g>
          )}

          {/* Price callout */}
          {animatedFraction > 0.02 && (
            <g>
              <rect
                x={dotX + 6}
                y={dotY - 12}
                width={62}
                height={16}
                rx="4"
                fill="#0f0f1a"
                stroke={step.color}
                strokeWidth="0.8"
                opacity="0.9"
              />
              <text
                x={dotX + 10}
                y={dotY}
                fontSize="9"
                fill={step.color}
                fontWeight="600"
              >
                {`${(priceY * 1000).toFixed(3)} mAE`}
              </text>
            </g>
          )}

          {/* Axes */}
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={toSvgY(0)}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />
          <line
            x1={PAD.left}
            y1={toSvgY(0)}
            x2={W - PAD.right}
            y2={toSvgY(0)}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Step description */}
      <div className="px-5 pb-4">
        <div
          className="rounded-xl p-4 transition-all duration-500"
          style={{
            background: `${step.color}12`,
            border: `1px solid ${step.color}30`,
          }}
        >
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${step.accentClass}`}>
            {t(step.labelKey, { defaultValue: `Step ${stepIndex + 1}` })}
          </p>
          <p className="text-sm text-white/80 leading-relaxed">
            {t(step.descKey, { defaultValue: '' })}
          </p>
        </div>
      </div>

      {/* Step dots + controls */}
      <div className="px-5 pb-5 flex items-center justify-between gap-3">
        {/* Step dots */}
        <div className="flex gap-2">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleStep(idx)}
              aria-label={`Step ${idx + 1}`}
              className="rounded-full transition-all duration-300 border-0 p-0 cursor-pointer"
              style={{
                width: idx === stepIndex ? 20 : 7,
                height: 7,
                background: idx === stepIndex ? step.color : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Prev / Play-Pause / Next */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleStep(Math.max(0, stepIndex - 1))}
            disabled={stepIndex === 0}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors border-0 cursor-pointer disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            aria-label="Previous step"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6.5 2L3.5 5l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={playing ? handlePause : handlePlay}
            className="flex items-center gap-1.5 px-3 h-7 rounded-full text-white text-xs font-semibold transition-all border-0 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              boxShadow: '0 0 12px rgba(139,92,246,0.4)',
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
                {stepIndex === STEPS.length - 1
                  ? t('bondingCurve.replay', { defaultValue: 'Replay' })
                  : t('bondingCurve.play', { defaultValue: 'Play' })}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleStep(Math.min(STEPS.length - 1, stepIndex + 1))}
            disabled={stepIndex === STEPS.length - 1}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors border-0 cursor-pointer disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            aria-label="Next step"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BondingCurveGraph;
