import React, { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Decimal } from '../../../libs/decimal';

interface AssetInputProps {
  modelValue?: string | number;
  onUpdateModelValue?: (value: string) => void;
  onFocus?: () => void;
  label?: string;
  tokenSymbol?: string;
  tokenBalance?: string;
  disabled?: boolean;
  isCoin?: boolean;
  maxBtnAllowed?: boolean;
  showBalance?: boolean;
  error?: boolean;
  errorMessages?: string[];
  color?: 'success' | 'default';
  aeValue?: Decimal;
  className?: string;
}

export interface AssetInputRef {
  focus: () => void;
}

const AETERNITY_TOKEN_BASE_DATA = {
  symbol: 'AE'
};

const AssetInput = forwardRef<AssetInputRef, AssetInputProps>(({
  modelValue = '',
  onUpdateModelValue,
  onFocus,
  label,
  tokenSymbol = AETERNITY_TOKEN_BASE_DATA.symbol,
  tokenBalance = '0',
  disabled = false,
  isCoin = false,
  maxBtnAllowed = false,
  showBalance = false,
  error = false,
  errorMessages = [],
  color = 'default',
  aeValue = Decimal.ZERO,
  className = '',
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Internal state for handling decimal input (like Vue model)
  const [internalValue, setInternalValue] = useState<string>(String(modelValue));

  // Update internal value when modelValue changes (similar to Vue watcher)
  useEffect(() => {
    const value = String(modelValue);
    
    if (value.includes('e')) {
      // Handle scientific notation
      setInternalValue(Decimal.from(modelValue).prettify(6));
    } else if (typeof modelValue === 'number' || !value.endsWith('.')) {
      // Update unless the value ends with a dot (user is typing decimal)
      setInternalValue(value);
    }
  }, [modelValue]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  const sanitizeValue = (value: string): string => {
    // Remove commas and negative signs, but keep decimal points and numbers
    let sanitized = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    
    return sanitized;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValue = sanitizeValue(rawValue);
    
    // Update internal value immediately for better UX
    setInternalValue(rawValue);
    
    // Only emit sanitized value to parent
    onUpdateModelValue?.(sanitizedValue);
  };

  const handleMaxClick = () => {
    onUpdateModelValue?.(tokenBalance);
  };

  const handleFocus = () => {
    onFocus?.();
  };

  const inputAssetSymbol = isCoin ? AETERNITY_TOKEN_BASE_DATA.symbol : tokenSymbol;
  const hasError = error || errorMessages.length > 0;

  // Format fiat price (simplified - would need to integrate with actual currency service)
  const formatFiatPrice = (value: Decimal): string => {
    if (value.isZero) return '0.00';
    return `$${value.prettify(2)}`;
  };
console.log('tokenBalance', tokenBalance);
  return (
    <div 
      className={cn(
        'asset-input',
        `color-${color}`,
        { disabled },
        className
      )}
    >
      {label && (
        <div className="pb-2 text-white opacity-80 text-sm">
          {label}
        </div>
      )}

      <label
        className={cn(
          "input-container block rounded cursor-text px-3 py-2 md:py-3 relative overflow-hidden min-h-[56px] transition-all duration-200",
          "border border-white/40 hover:border-white focus-within:border-white focus-within:border-2",
          hasError && "border-red-500 shadow-[inset_0_0_10px_rgb(239,68,68)]",
          color === 'success' && "border-green-500"
        )}
      >
        <div className="flex items-center gap-5">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={internalValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              "flex-1 input w-full text-xl leading-7 p-3 h-7 text-ellipsis whitespace-nowrap overflow-hidden",
              "border-none outline-none bg-transparent text-white placeholder-white/60",
              "focus:border-none focus:outline-none focus:ring-0",
              "min-w-[40%]"
            )}
            placeholder="0.00"
            autoFocus
          />
          <div className="symbol mt-1 whitespace-nowrap font-bold text-sm text-white/90">
            {inputAssetSymbol}
          </div>
        </div>

        {showBalance && (
          <div className="flex items-center justify-between mt-2">
            {isCoin ? (
              <div className="flex items-center gap-1 text-sm text-white/70">
                <span>USD</span>
                <span>{formatFiatPrice(aeValue)}</span>
              </div>
            ) : (
              <div className="text-sm text-white/70">
                <span className="opacity-60">Balance:&nbsp;</span>
                <span>{Decimal.from(tokenBalance).prettify()}</span>
              </div>
            )}
            
            {maxBtnAllowed && parseInt(tokenBalance, 10) > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="px-2 h-6 text-xs rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={handleMaxClick}
              >
                Max
              </Button>
            )}
          </div>
        )}

        {errorMessages.length > 0 && (
          <div className="text-red-400 text-sm mt-1">
            {errorMessages.map((message, index) => (
              <div key={index}>{message}</div>
            ))}
          </div>
        )}
      </label>
    </div>
  );
});

AssetInput.displayName = 'AssetInput';

export default AssetInput;
