import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ConnectWalletButton } from '../../components/ConnectWalletButton';
import { useSwapExecution } from '../../components/dex/hooks/useSwapExecution';
import { useTokenBalances } from '../../components/dex/hooks/useTokenBalances';
import { useAccount } from '../../hooks';
import { Decimal } from '../../libs/decimal';
import { DEX_ADDRESSES } from '../../libs/dex';
import { cn } from '../../lib/utils';
import Spinner from '../../components/Spinner';

interface WrapUnwrapWidgetProps {
  className?: string;
}

export const WrapUnwrapWidget = ({ className }: WrapUnwrapWidgetProps) => {
  const { t } = useTranslation('common');
  const { activeAccount, loadAccountData } = useAccount();
  const { wrapBalances } = useTokenBalances(null, null);
  const { executeSwap, loading } = useSwapExecution();

  const [wrapAmount, setWrapAmount] = useState<string>('');
  const [unwrapAmount, setUnwrapAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap');

  const isLoading = loading;
  const currentAmount = mode === 'wrap' ? wrapAmount : unwrapAmount;
  const setCurrentAmount = mode === 'wrap' ? setWrapAmount : setUnwrapAmount;
  const currentBalance = mode === 'wrap' ? wrapBalances.ae : wrapBalances.wae;

  // Reset error when switching modes or changing amounts
  useEffect(() => {
    setError(null);
  }, [mode, currentAmount]);

  // Check for insufficient balance
  useEffect(() => {
    if (currentAmount && currentBalance) {
      try {
        const amount = Decimal.from(currentAmount);
        const balance = Decimal.from(currentBalance);
        if (amount.gt(balance)) {
          setError(`Insufficient ${mode === 'wrap' ? 'AE' : 'WAE'} balance. You need ${amount.prettify()} but only have ${balance.prettify()}`);
        }
      } catch {
        // Invalid amount format, ignore
      }
    }
  }, [currentAmount, currentBalance, mode]);

  const handleAmountChange = (value: string) => {
    const raw = value.replace(/,/g, '.');
    const match = raw.match(/^\d*(?:\.(\d*)?)?$/);
    if (!match) return; // block invalid chars
    const frac = match[1] || '';
    const trimmed = frac.length > 18 ? `${raw.split('.')[0]}.${frac.slice(0, 18)}` : raw;
    if (trimmed.startsWith('.')) return; // disallow leading dot
    setCurrentAmount(trimmed);
  };

  const handleMaxClick = () => {
    if (currentBalance && !isLoading) {
      setCurrentAmount(currentBalance);
    }
  };

  const handleHalfClick = () => {
    if (currentBalance && !isLoading) {
      const halfBalance = Decimal.from(currentBalance).div(2).toString();
      setCurrentAmount(halfBalance);
    }
  };

  const handleExecute = async () => {
    if (!currentAmount || Number(currentAmount) <= 0) return;

    try {
      setError(null);

      // Create token objects for AE and WAE
      const aeToken = {
        address: 'AE',
        name: 'Aeternity',
        symbol: 'AE',
        decimals: 18,
        pairs_count: 0,
        created_at: new Date().toISOString(),
        is_ae: true,
      };

      const waeToken = {
        address: DEX_ADDRESSES.wae,
        name: 'Wrapped AE',
        symbol: 'WAE',
        decimals: 18,
        pairs_count: 0,
        created_at: new Date().toISOString(),
        is_ae: false,
      };

      // Determine tokenIn and tokenOut based on mode
      const tokenIn = mode === 'wrap' ? aeToken : waeToken;
      const tokenOut = mode === 'wrap' ? waeToken : aeToken;

      // Execute the swap (which will use wrap/unwrap internally)
      await executeSwap({
        tokenIn: tokenIn as any, // TODO: define types
        tokenOut: tokenOut as any,
        amountIn: currentAmount,
        amountOut: currentAmount, // 1:1 ratio
        path: [], // Will be handled by executeSwap
        slippagePct: 0.5, // Minimal slippage for wrap/unwrap
        deadlineMins: 20,
        isExactIn: true,
      });

      // Clear the input and reload account data on success
      setCurrentAmount('');
      loadAccountData();
    } catch (e: any) {
      setError(e.message || `Failed to ${mode} tokens`);
    }
  };

  const isExecuteDisabled = isLoading || !currentAmount || Number(currentAmount) <= 0 || !!error;

  return (
    <div
      className={cn(
        'max-w-[min(480px,100%)] bg-transparent border-0 p-0 relative overflow-hidden sm:bg-white/[0.02] sm:border sm:border-white/10 sm:backdrop-blur-[20px] sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold m-0 sh-dex-title">
          (Un)Wrap AE
        </h2>

        {/* Mode Toggle */}
        <div className="flex bg-white/[0.05] border border-white/10 rounded-xl p-1 backdrop-blur-[10px]">
          <Button
            onClick={() => setMode('wrap')}
            disabled={isLoading}
            variant={mode === 'wrap' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300',
              mode === 'wrap'
                ? 'bg-[#1161FE] text-white active:bg-[#1161FE]'
                : 'text-white/60 hover:text-white hover:bg-white/10',
            )}
          >
            Wrap
          </Button>
          <Button
            onClick={() => setMode('unwrap')}
            disabled={isLoading}
            variant={mode === 'unwrap' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300',
              mode === 'unwrap'
                ? 'bg-[#1161FE] text-white active:bg-[#1161FE]'
                : 'text-white/60 hover:text-white hover:bg-white/10',
            )}
          >
            Unwrap
          </Button>
        </div>
      </div>

      {/* Description */}
      <p className="m-0 mb-4 text-sm text-white/60 leading-relaxed">
        Wrap AE into WAE (and unwrap) for compatibility with DeFi protocols.
      </p>

      {/* Balance Display */}
      <Card className="bg-white/[0.03] border-white/10 rounded-2xl mb-5 backdrop-blur-[10px]">
        <CardContent className="p-4">
          <div className="flex justify-between items-center gap-4">
            <div className="text-center flex-1">
              <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">
                AE Balance
              </div>
              <div className="text-base font-bold text-white font-mono">
                {wrapBalances.ae ? Decimal.from(wrapBalances.ae).prettify() : '…'}
              </div>
            </div>

            <div className="w-0.5 h-10 bg-white/10 rounded-full" />

            <div className="text-center flex-1">
              <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">
                WAE Balance
              </div>
              <div className="text-base font-bold text-white font-mono">
                {wrapBalances.wae ? Decimal.from(wrapBalances.wae).prettify() : '…'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amount Input */}
      <Card className="bg-white/[0.03] border-white/10 rounded-2xl mb-5 backdrop-blur-[10px]">
        <CardContent className="p-4">
          {/* Label and Balance Row */}
          <div className="flex flex-row flex-wrap gap-2 items-center mb-3">
            <div className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Amount to
              {' '}
              {mode}
            </div>

            {currentBalance && (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <div>
                  Balance:
                  <span className="font-semibold text-white text-xs ml-2">
                    {Decimal.from(currentBalance).prettify()}
                  </span>
                </div>

                {/* Balance buttons */}
                <div className="flex gap-1.5">
                  <Button
                    onClick={handleHalfClick}
                    disabled={isLoading || !currentBalance || Number(currentBalance) === 0}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs font-semibold bg-white/[0.05] border-white/10 text-white/60 hover:bg-[#1161FE] hover:text-white hover:border-transparent transition-all duration-200"
                  >
                    50%
                  </Button>

                  <Button
                    onClick={handleMaxClick}
                    disabled={isLoading || !currentBalance || Number(currentBalance) === 0}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs font-semibold bg-white/[0.05] border-white/10 text-white/60 hover:bg-[#1161FE] hover:text-white hover:border-transparent transition-all duration-200"
                  >
                    MAX
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Input Field */}
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/10">
            <div className="text-lg font-bold text-white min-w-[60px]">
              {mode === 'wrap' ? 'AE →' : 'WAE →'}
            </div>

            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={currentAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none text-white text-2xl font-bold font-mono text-right h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/30"
              aria-label={`${mode}-amount`}
            />

            <div className="text-lg font-bold text-white min-w-[60px] text-right">
              {mode === 'wrap' ? 'WAE' : 'AE'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="text-red-400 text-sm py-3 px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-5 text-center">
          {error}
        </div>
      )}

      {/* Execute Button */}
      {activeAccount ? (
        <Button
          onClick={handleExecute}
          disabled={isExecuteDisabled}
          className={cn(
            'w-full px-6 py-3 sm:px-5 sm:py-3 rounded-full border-none text-white cursor-pointer text-base font-semibold tracking-wide uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
            isExecuteDisabled
              ? 'bg-white/10 cursor-not-allowed opacity-60'
              : 'bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:-translate-y-0.5 active:translate-y-0',
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner className="w-4 h-4" />
              {mode === 'wrap' ? 'Wrapping…' : 'Unwrapping…'}
            </div>
          ) : (
            `${mode === 'wrap' ? 'Wrap AE → WAE' : 'Unwrap WAE → AE'}`
          )}
        </Button>
      ) : (
        <ConnectWalletButton
          label={t('buttons.connectWalletDex', { ns: 'common' })}
          variant="dex"
          className="text-sm"
          block
        />
      )}
    </div>
  );
};
