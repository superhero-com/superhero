import React from 'react';
import TokenSelector from './TokenSelector';
import { DexTokenDto } from '../../../api/generated';
import { Decimal } from '../../../libs/decimal';
import { AeButton } from '../../ui/ae-button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { AeCard, AeCardContent } from '../../ui/ae-card';
import { cn } from '@/lib/utils';

interface TokenInputProps {
  label: string;
  token: DexTokenDto | null;
  skipToken: DexTokenDto | null;
  amount: string;
  balance?: string;
  onTokenChange: (token: DexTokenDto) => void;
  onAmountChange: (amount: string) => void;
  tokens: DexTokenDto[];
  excludeTokens?: DexTokenDto[];
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hasInsufficientBalance?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function TokenInput({
  label,
  token,
  skipToken,
  amount,
  balance,
  onTokenChange,
  onAmountChange,
  tokens,
  excludeTokens = [],
  disabled = false,
  loading = false,
  readOnly = false,
  placeholder = "0.0",
  searchValue = "",
  onSearchChange,
  hasInsufficientBalance = false,
  onFocus,
  onBlur
}: TokenInputProps) {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '.');
    const decs = token?.decimals ?? 18;
    const m = raw.match(/^\d*(?:\.(\d*)?)?$/);
    if (!m) return; // block invalid chars
    const frac = m[1] || '';
    const trimmed = frac.length > decs ? `${raw.split('.')[0]}.${frac.slice(0, decs)}` : raw;
    if (trimmed.startsWith('.')) return; // disallow leading dot
    onAmountChange(trimmed);
  };

  return (
    <AeCard 
      variant="glass" 
      className={cn(
        "transition-all duration-300 border-glass-border",
        hasInsufficientBalance && "border-destructive"
      )}
      style={{
        background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.04), transparent 40%), rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: hasInsufficientBalance ? 
          "0 8px 25px rgba(255, 107, 107, 0.2)" : 
          "0 8px 25px rgba(0,0,0,0.2)"
      }}
    >
      <AeCardContent className="p-4">
        {/* Label and Balance Row */}
        <div className="flex justify-between items-center mb-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </Label>
          {balance && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                Balance:
                <span className="font-semibold text-foreground">
                  {Decimal.from(balance).prettify()}
                </span>
              </div>
              
              {/* Max, 50% buttons */}
              <div className="flex gap-1 items-center">
                <AeButton
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    if (balance && !disabled && !readOnly) {
                      const halfBalance = Decimal.from(balance).div(2).toString();
                      onAmountChange(halfBalance);
                    }
                  }}
                  disabled={disabled || readOnly || !balance || Number(balance) === 0}
                  className="h-6 px-2 text-xs font-semibold border border-glass-border hover:bg-accent hover:text-accent-foreground"
                >
                  50%
                </AeButton>
                
                <AeButton
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    if (balance && !disabled && !readOnly) {
                      onAmountChange(balance);
                    }
                  }}
                  disabled={disabled || readOnly || !balance || Number(balance) === 0}
                  className="h-6 px-2 text-xs font-semibold border border-glass-border hover:bg-accent hover:text-accent-foreground"
                >
                  MAX
                </AeButton>
              </div>
            </div>
          )}
        </div>

        {/* Main Input Row */}
        <div className="flex gap-3 items-center justify-between p-1 rounded-xl backdrop-blur-md">
          {/* Token Selector */}
          <div className="flex-shrink-0">
            <TokenSelector
              selected={token}
              skipToken={skipToken}
              onSelect={onTokenChange}
              exclude={excludeTokens}
              disabled={disabled}
              loading={loading}
              tokens={tokens}
              searchValue={searchValue}
              onSearchChange={onSearchChange}
            />
          </div>

          {/* Amount Input */}
          <div className="flex-1 flex items-center">
            <Input
              type="text"
              inputMode="decimal"
              placeholder={placeholder}
              value={amount}
              onChange={handleAmountChange}
              onFocus={onFocus}
              onBlur={onBlur}
              readOnly={readOnly}
              disabled={disabled}
              className="flex-1 bg-transparent border-none text-right text-lg font-semibold font-mono text-foreground focus:ring-0 focus:border-none shadow-none p-0"
              aria-label={`amount-${label.toLowerCase()}`}
            />
          </div>
        </div>

        {/* Insufficient Balance Warning */}
        {hasInsufficientBalance && balance && amount && Number(amount) > 0 && (
          <div className="mt-2 text-xs text-destructive font-medium flex items-center gap-1">
            ⚠️ Insufficient {token?.symbol} balance. You need {amount} but only have {Decimal.from(balance).prettify()}
          </div>
        )}
      </AeCardContent>
    </AeCard>
  );
}
