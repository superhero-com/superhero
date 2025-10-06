import React from 'react';
import { Button } from '../../../components/ui/button';
import { ChevronDown, ArrowUpDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import AssetInput from './AssetInput';
import { TokenDto } from "@/api/generated/models/TokenDto";
import { Decimal } from '../../../libs/decimal';

interface TradeTokenInputProps {
  token?: TokenDto;
  tokenA?: number;
  tokenB?: number;
  tokenAFocused: boolean;
  isBuying: boolean;
  userBalance: string;
  spendableAeBalance: Decimal;
  onTokenAChange: (value: number | undefined) => void;
  onTokenBChange: (value: number | undefined) => void;
  onTokenAFocus: () => void;
  onTokenBFocus: () => void;
  onToggleTradeView: () => void;
  readonly?: boolean;
  isInsufficientBalance?: boolean;
}

export default function TradeTokenInput({
  token,
  tokenA,
  tokenB,
  tokenAFocused,
  isBuying,
  userBalance,
  spendableAeBalance,
  onTokenAChange,
  onTokenBChange,
  onTokenAFocus,
  onTokenBFocus,
  onToggleTradeView,
  readonly = false,
  isInsufficientBalance = false,
}: TradeTokenInputProps) {
  
  const handleTokenAUpdate = (value: string) => {
    // Allow empty string, partial decimals like "0." or "."
    if (value === '' || value === '.') {
      onTokenAChange(undefined);
      return;
    }
    
    const numValue = parseFloat(value);
    // Only update if it's a valid number or allow partial input
    if (!isNaN(numValue) || value.endsWith('.')) {
      onTokenAChange(isNaN(numValue) ? undefined : numValue);
    }
  };

  const handleTokenBUpdate = (value: string) => {
    // Allow empty string, partial decimals like "0." or "."
    if (value === '' || value === '.') {
      onTokenBChange(undefined);
      return;
    }
    
    const numValue = parseFloat(value);
    // Only update if it's a valid number or allow partial input
    if (!isNaN(numValue) || value.endsWith('.')) {
      onTokenBChange(isNaN(numValue) ? undefined : numValue);
    }
  };

  if (!token?.sale_address) {
    return null;
  }

  return (
    <div className="trade-token-input space-y-1">
      {/* First Asset Input */}
      <AssetInput
        modelValue={tokenA?.toString() || ''}
        onUpdateModelValue={handleTokenAUpdate}
        tokenSymbol={token.symbol}
        isCoin={isBuying}
        tokenBalance={isBuying ? spendableAeBalance.toString() : userBalance}
        maxBtnAllowed
        showBalance
        errorMessages={isInsufficientBalance ? ['Insufficient balance'] : undefined}
        onFocus={onTokenAFocus}
        className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-xl"
      />

      {/* Middle Arrow Button */}
      <div className="mid-arrow relative z-10 h-0 my-1">
        <Button
          variant="outline"
          size="icon"
          disabled={readonly}
          onClick={onToggleTradeView}
          className={cn(
            "absolute -top-5 left-1/2 transform",
            "bg-card/90 backdrop-blur-sm border-border w-8 h-8 p-0 rounded-full",
            "hover:bg-card/70 transition-colors duration-200",
            "shadow-lg"
          )}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Second Asset Input */}
      <AssetInput
        modelValue={tokenB?.toString() || ''}
        onUpdateModelValue={handleTokenBUpdate}
        tokenSymbol={token.symbol}
        isCoin={!isBuying}
        tokenBalance={!isBuying ? spendableAeBalance.toString() : userBalance}
        showBalance
        onFocus={onTokenBFocus}
        className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-xl"
      />
    </div>
  );
}
