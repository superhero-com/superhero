import { useAtom } from 'jotai';
import { useState } from 'react';
import { PRICE_MOVEMENT_TIMEFRAMES } from '@/utils/constants';
import { performanceChartTimeframeAtom, PriceMovementTimeframe } from '../atoms';

export default function PerformanceTimeframeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useAtom(performanceChartTimeframeAtom);

  const handleUpdate = (newValue: PriceMovementTimeframe) => {
    setValue(newValue);
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      {/* Mobile: Horizontal segmented buttons */}
      <div className="sm:hidden w-full">
        <div className="flex w-full items-center justify-between gap-2">
          {PRICE_MOVEMENT_TIMEFRAMES.map((timeframe) => {
            const isActive = value === timeframe;
            return (
              <button
                key={timeframe}
                onClick={() => handleUpdate(timeframe)}
                className={`flex-1 px-2 py-2 h-10 text-xs rounded-lg border transition-all duration-300 focus:outline-none ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg'
                    : 'bg-white/[0.02] text-white border-white/10 hover:bg-white/[0.05]'
                }`}
              >
                {timeframe.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop/Tablet: Existing dropdown */}
      <div className="relative hidden sm:block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-2 h-10 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05] w-full sm:w-auto flex items-center justify-between gap-2"
        >
          <span className="uppercase text-xs">{value}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 sm:right-0 sm:left-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-lg z-20 min-w-[140px] w-full sm:w-auto">
              <div className="py-1">
                {PRICE_MOVEMENT_TIMEFRAMES
                  .filter((timeframe) => timeframe !== value)
                  .map((timeframe) => (
                    <button
                      key={timeframe}
                      onClick={() => handleUpdate(timeframe)}
                      className="w-full px-2 py-1.5 text-left text-xs text-white hover:bg-white/10 transition-colors"
                    >
                      {timeframe.toUpperCase()}
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
