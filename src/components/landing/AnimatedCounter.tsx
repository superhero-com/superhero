import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectionTheme } from '../layout/AppLayout';

// Note: useTheme and useSectionTheme are used in other components below

interface AnimatedCounterProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({ 
  value, 
  prefix = '', 
  suffix = '',
  duration = 2000,
  decimals = 0,
  className = ''
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [lastAnimatedValue, setLastAnimatedValue] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | null>(null);

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value;

  // Track visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    // Also check if already visible on mount
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setIsVisible(true);
      }
    }

    return () => observer.disconnect();
  }, []);

  // Animate when visible and value changes (or first time with data)
  useEffect(() => {
    if (isVisible && numericValue > 0 && numericValue !== lastAnimatedValue) {
      // Cancel any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      const startValue = lastAnimatedValue === 0 ? 0 : displayValue;
      setLastAnimatedValue(numericValue);
      animateValue(startValue, numericValue, duration);
    }
  }, [isVisible, numericValue, duration, lastAnimatedValue]);

  const animateValue = (start: number, end: number, dur: number) => {
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / dur, 1);
      
      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const current = start + (end - start) * easeOutQuart;
      setDisplayValue(current);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const formatValue = (val: number): string => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(2) + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(2) + 'K';
    }
    return val.toFixed(decimals);
  };

  return (
    <span 
      ref={elementRef}
      className={`font-bold tabular-nums ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  );
}

// Odometer-style digit roller
interface OdometerProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function Odometer({ value, prefix = '', suffix = '', className = '' }: OdometerProps) {
  const { isDark } = useTheme();
  const { colors } = useSectionTheme();
  
  // Convert value to string for digit display
  const stringValue = typeof value === 'string' ? value : formatNumber(value);
  const digits = stringValue.split('');
  
  return (
    <span className={`inline-flex items-center ${className}`}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <span className="inline-flex overflow-hidden">
        {digits.map((digit, index) => (
          <OdometerDigit 
            key={index} 
            digit={digit} 
            delay={index * 100}
            isDark={isDark}
            accentColor={colors.primary}
          />
        ))}
      </span>
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(0);
}

interface OdometerDigitProps {
  digit: string;
  delay: number;
  isDark: boolean;
  accentColor: string;
}

function OdometerDigit({ digit, delay, isDark, accentColor }: OdometerDigitProps) {
  const [currentDigit, setCurrentDigit] = useState('0');
  const [isAnimating, setIsAnimating] = useState(false);
  const isNumber = /\d/.test(digit);
  
  useEffect(() => {
    if (!isNumber) {
      setCurrentDigit(digit);
      return;
    }
    
    const timer = setTimeout(() => {
      setIsAnimating(true);
      // Animate through digits
      const targetNum = parseInt(digit);
      let current = 0;
      const interval = setInterval(() => {
        setCurrentDigit(current.toString());
        current++;
        if (current > targetNum) {
          clearInterval(interval);
          setIsAnimating(false);
        }
      }, 80);
      
      return () => clearInterval(interval);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [digit, delay, isNumber]);

  if (!isNumber) {
    return (
      <span className="inline-block">{digit}</span>
    );
  }

  return (
    <span 
      className={`
        inline-block w-[0.6em] text-center relative overflow-hidden
        transition-transform duration-200
        ${isAnimating ? 'scale-110' : 'scale-100'}
      `}
    >
      <span 
        className={`
          inline-block transition-all duration-150
          ${isAnimating ? 'blur-[1px]' : 'blur-0'}
        `}
        style={{
          color: isAnimating ? accentColor : 'inherit',
          textShadow: isAnimating ? `0 0 8px ${accentColor}50` : 'none'
        }}
      >
        {currentDigit}
      </span>
    </span>
  );
}

// Pulsing stat with icon
interface PulsingStatProps {
  value: number | string;
  label: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function PulsingStat({ value, label, icon, trend, trendValue }: PulsingStatProps) {
  const { isDark } = useTheme();
  const { colors } = useSectionTheme();
  
  return (
    <div className="flex flex-col items-center relative">
      {/* Pulsing background */}
      <div 
        className="absolute -inset-2 rounded-2xl animate-pulse opacity-20"
        style={{ background: colors.gradient }}
      />
      
      {/* Icon */}
      <div 
        className="relative w-10 h-10 rounded-xl flex items-center justify-center mb-2"
        style={{ background: `${colors.primary}20` }}
      >
        <div style={{ color: colors.primary }}>{icon}</div>
      </div>
      
      {/* Value */}
      <AnimatedCounter 
        value={typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value}
        className={`text-xl md:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}
      />
      
      {/* Trend indicator */}
      {trend && trendValue && (
        <div 
          className={`
            flex items-center gap-1 text-xs font-medium mt-1
            ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-gray-500'}
          `}
        >
          {trend === 'up' && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
          {trend === 'down' && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {trendValue}
        </div>
      )}
      
      {/* Label */}
      <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

// Mini sparkline chart
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20, 
  color,
  showArea = true 
}: SparklineProps) {
  const { colors } = useSectionTheme();
  const lineColor = color || colors.primary;
  
  if (!data.length) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {showArea && (
        <polygon 
          points={areaPoints} 
          fill={`${lineColor}20`}
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Animated dot at the end */}
      <circle 
        cx={width} 
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={lineColor}
        className="animate-pulse"
      />
    </svg>
  );
}

// Progress ring for percentage values
interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ProgressRing({ 
  value, 
  size = 60, 
  strokeWidth = 4,
  label 
}: ProgressRingProps) {
  const { isDark } = useTheme();
  const { colors } = useSectionTheme();
  const [animatedValue, setAnimatedValue] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 500);
    return () => clearTimeout(timer);
  }, [value]);
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 4px ${colors.primary}50)`
          }}
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {Math.round(animatedValue)}%
        </span>
        {label && (
          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

