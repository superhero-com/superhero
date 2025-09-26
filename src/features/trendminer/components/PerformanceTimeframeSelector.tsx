import { useState } from "react";

type PriceMovementTimeframe = '1D' | '7D' | '30D';

const PRICE_MOVEMENT_TIMEFRAMES: PriceMovementTimeframe[] = ['1D', '7D', '30D'];
const PRICE_MOVEMENT_TIMEFRAME_DEFAULT: PriceMovementTimeframe = '30D';

interface PerformanceTimeframeSelectorProps {
  value?: PriceMovementTimeframe;
  onChange?: (value: PriceMovementTimeframe) => void;
}

export default function PerformanceTimeframeSelector({
  value = PRICE_MOVEMENT_TIMEFRAME_DEFAULT,
  onChange
}: PerformanceTimeframeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleUpdate = (newValue: PriceMovementTimeframe) => {
    onChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="period-selector-button bg-transparent border-none text-white/70 hover:text-white/90 transition-colors text-right font-normal text-sm opacity-70 tracking-tight cursor-pointer flex items-center gap-1"
      >
        <span className="uppercase">{value}</span>
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
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20 min-w-[80px]">
            <div className="py-1">
              {PRICE_MOVEMENT_TIMEFRAMES
                .filter(timeframe => timeframe !== value)
                .map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => handleUpdate(timeframe)}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors"
                  >
                    {timeframe}
                  </button>
                ))}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .period-selector-button {
          height: unset;
          font-weight: 400;
          font-size: 15px;
          opacity: 0.7;
          letter-spacing: -0.1px;
        }

        .period-selector-button:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
