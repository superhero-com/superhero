import React from 'react';

type FromToProps = {
  embedded?: boolean;
  fromLabel?: string;
  toLabel?: string;
  fromAmount: string;
  onChangeFromAmount: (value: string) => void;
  inputType?: 'text' | 'number';
  inputStep?: string;
  fromBalanceText?: string | null;
  onMaxClick?: () => void;
  maxDisabled?: boolean;
  fromTokenNode: React.ReactNode;
  toValue: string;
  toLoading?: boolean;
  toTokenNode: React.ReactNode;
};

export default function FromTo(props: FromToProps) {
  const {
    embedded = false,
    fromLabel = 'From',
    toLabel = 'To',
    fromAmount,
    onChangeFromAmount,
    inputType = 'text',
    inputStep,
    fromBalanceText,
    onMaxClick,
    maxDisabled,
    fromTokenNode,
    toValue,
    toLoading,
    toTokenNode,
  } = props;

  const sectionBase = 'border border-white/10 rounded-2xl p-3 sm:p-4';
  const sectionBg = embedded ? 'bg-transparent' : 'bg-white/[0.05] backdrop-blur-[10px]';
  const arrowCircleBg = embedded ? 'bg-transparent' : 'bg-white/[0.08] backdrop-blur-[10px]';

  return (
    <div>
      {/* From */}
      <div className={`${sectionBase} ${sectionBg} mb-2`}>
        <div className="flex justify-between items-center mb-2 min-w-0">
          <label className="text-xs text-white/60 font-medium uppercase tracking-wider flex-shrink-0">
            {fromLabel}
          </label>
          <div className="flex items-center gap-2 flex-shrink-0">
            {fromBalanceText && (
              <span className="text-xs text-white/60">{fromBalanceText}</span>
            )}
            {onMaxClick && (
              <button
                onClick={onMaxClick}
                disabled={!!maxDisabled}
                className={`text-[10px] text-[#4ecdc4] bg-transparent border border-[#4ecdc4] rounded px-1.5 py-0.5 cursor-pointer uppercase tracking-wider hover:bg-[#4ecdc4]/10 transition-all duration-300 flex-shrink-0 ${maxDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {maxDisabled ? '...' : 'MAX'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <input
            type={inputType}
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => onChangeFromAmount(e.target.value)}
            {...(inputType === 'number' && inputStep ? { step: inputStep } : {})}
            className={`flex-1 ${embedded ? '!bg-transparent !border-none' : 'bg-transparent border-none'} text-white text-xl sm:text-2xl font-semibold outline-none min-w-0 overflow-hidden shadow-none`}
          />
          {fromTokenNode}
        </div>
      </div>

      {/* Arrow */}
      {!embedded && (
        <div className="flex justify-center my-3 sm:my-4 relative">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 ${arrowCircleBg} text-white flex items-center justify-center text-lg sm:text-xl font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.25)] z-[2] relative`}>
            ⬇️
          </div>
        </div>
      )}

      {/* To */}
      <div className={`${sectionBase} ${sectionBg} mb-4 sm:mb-5`}>
        <div className="flex justify-between items-center mb-2 min-w-0">
          <label className="text-xs text-white/60 font-medium uppercase tracking-wider flex-shrink-0">
            {toLabel}
          </label>
          {/* Right side descriptor slot could be added here if needed */}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex-1 text-xl sm:text-2xl font-base text-white/60 min-w-0 overflow-hidden">
            {toLoading ? 'Quoting…' : toValue || '0.0'}
          </div>
          {toTokenNode}
        </div>
      </div>
    </div>
  );
}
