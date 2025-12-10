import FractionFormatter from '@/features/shared/components/FractionFormatter';
import { formatFractionalPrice } from '@/utils/common';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { useCurrencies } from '../../../hooks/useCurrencies';
import { cn } from '../../../lib/utils';
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
  fiatValue?: Decimal;
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
  fiatValue,
  className = '',
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { getFiat, currentCurrencyInfo } = useCurrencies();


  // Internal state for handling decimal input (like Vue model)
  const [internalValue, setInternalValue] = useState<string>(String(modelValue));

  const fiatPrice = useMemo(() => {
    // Use provided fiatValue if available (more accurate for large token amounts)
    if (fiatValue !== undefined) {
      return fiatValue;
    }
    // Fallback to calculating from AE value
    return getFiat(isCoin ? Decimal.from(modelValue) : aeValue);
  }, [modelValue, aeValue, isCoin, fiatValue, getFiat]);

  // Update internal value when modelValue changes (similar to Vue watcher)
  useEffect(() => {
    const value = String(modelValue);

    if (value.includes('e')) {
      // Handle scientific notation
      const formatted = Decimal.from(modelValue).prettify();
      setInternalValue(formatMoney(formatted));
    } else if (typeof modelValue === 'number' || !value.endsWith('.')) {
      // Update unless the value ends with a dot (user is typing decimal)
      setInternalValue(formatMoney(value));
    }
  }, [modelValue]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  const sanitizeValue = (value: string): string => {
    // Remove all non-numeric characters except decimal point
    let sanitized = value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places to 8 (common for crypto)
    const decimalLimit = 21; 
    if (parts.length === 2 && parts[1].length > decimalLimit) {
      sanitized = parts[0] + '.' + parts[1].substring(0, decimalLimit);
    }

    return sanitized;
  };

  const formatMoney = (value: string): string => {
    if (!value || value === '') return '';
    
    // Remove any existing formatting
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Split into integer and decimal parts
    const parts = cleanValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // Only add thousands separators if the integer part has more than 3 digits
    // and is not just zeros (to avoid formatting 0.000000 as 0,000,000)
    let formattedInteger = integerPart;
    if (integerPart.length > 3 && integerPart !== '0') {
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Combine with decimal part
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValue = sanitizeValue(rawValue);
    
    // Use raw value for display if it ends with decimal point or has trailing zeros after decimal
    // Use formatted value for complete numbers
    let displayValue;
    if (rawValue.endsWith('.') || (rawValue.includes('.') && rawValue.endsWith('0'))) {
      // Keep the raw value for partial decimal input or trailing zeros
      displayValue = rawValue;
    } else {
      // Format complete numbers
      displayValue = formatMoney(sanitizedValue);
    }

    // Update internal value with display value
    setInternalValue(displayValue);

    // Only emit sanitized value to parent (without formatting)
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
              "flex-1 input w-full text-xl leading-7 h-7 text-ellipsis whitespace-nowrap overflow-hidden",
              "border-none outline-none bg-transparent text-white placeholder-white/60",
              "focus:border-none focus:outline-none focus:ring-0",
              "min-w-[40%]",
              "shadow-none"
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
                <span>{currentCurrencyInfo.symbol} </span>
                <FractionFormatter fractionalPrice={formatFractionalPrice(fiatPrice) as any} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <span>{currentCurrencyInfo.symbol} </span>
                  <FractionFormatter fractionalPrice={formatFractionalPrice(fiatPrice) as any} />
                </div>
                <span className="opacity-60">|</span>
                <div>
                  <span className="opacity-60">Balance:&nbsp;</span>
                  <span>{Decimal.from(tokenBalance).prettify()}</span>
                </div>
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
