import {
  memo, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AddressAvatar from '@/components/AddressAvatar';
import AddressFormatted from '@/components/AddressFormatted';
import { AeCard, AeCardContent } from '@/components/ui/ae-card';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { useChainName } from '@/hooks/useChainName';
import { cn } from '@/lib/utils';
import { Decimal } from '@/libs/decimal';

interface AddressAvatarWithChainNameProps {
    address: string;
    size?: number;
    overlaySize?: number;
    showAddressAndChainName?: boolean;
    // When true, show only one primary line: chain name if available,
    // otherwise the address. Useful for compact header displays.
    showPrimaryOnly?: boolean;
    showBalance?: boolean;
    showBalanceInHover?: boolean;
    truncateAddress?: boolean;
    className?: string;
    isHoverEnabled?: boolean;
    avatarBackground?: boolean;
    hideFallbackName?: boolean;
    secondary?: React.ReactNode;
    contentClassName?: string;
    variant?: 'default' | 'feed';
}

export const AddressAvatarWithChainName = memo(({
  address,
  size = 36,
  overlaySize = 18,
  showAddressAndChainName = true,
  showPrimaryOnly = false,
  showBalance = false,
  showBalanceInHover,
  truncateAddress = false,
  className,
  isHoverEnabled = true,
  avatarBackground = false,
  hideFallbackName = false,
  secondary,
  contentClassName,
  variant = 'default',
}: AddressAvatarWithChainNameProps) => {
  const navigate = useNavigate();

  // Hooks must be called unconditionally before any early returns
  // Use empty string as fallback to ensure hooks are always called with a valid value
  const { decimalBalance, aex9Balances, loadAccountData } = useAccountBalances(address || '');
  const { chainName } = useChainName(address || '');

  // Guard against undefined/null address after hooks are called
  if (!address) {
    return null;
  }

  // Hover state management (same as UserBadge)
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Use a ref to store the latest loadAccountData to avoid duplicate calls
  // Note: useAccountBalances already calls loadAccountData when selectedAccount changes
  const loadAccountDataRef = useRef(loadAccountData);

  // Calculate position for hover card
  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  };

  // Show card after 300ms delay when hovering
  useEffect(() => {
    if (!hover || !isHoverEnabled) {
      setVisible(false);
      return;
    }
    updatePosition();
    const id = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(id);
  }, [hover, isHoverEnabled]);

  // Keep the ref updated with the latest loadAccountData function
  useEffect(() => {
    loadAccountDataRef.current = loadAccountData;
  }, [loadAccountData]);

  // Start loading data immediately when hover starts (not when card becomes visible)
  // This way data is loading/loaded by the time the 300ms delay expires
  useEffect(() => {
    if (!address) return;
    if (showBalance || hover) {
      loadAccountDataRef.current();
    }
  }, [address, showBalance, hover]);

  // Handle click outside to close card
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!cardRef.current) return;
      if (cardRef.current.contains(e.target as Node)) return;
      if (ref.current && ref.current.contains(e.target as Node)) return;
      setVisible(false);
    }
    if (visible) document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [visible]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/users/${address}`);
  };

  const resolvedShowBalanceInHover = showBalanceInHover ?? (variant === 'feed' ? showBalance : true);

  const renderContent = () => (
    <>
      <div className="relative flex-shrink-0">
        <div className="relative">
          <div className="rounded-full overflow-hidden shadow-md">
            <AddressAvatar address={address} size={size} borderRadius="50%" />
          </div>
        </div>
      </div>

      {(() => {
        const shouldShowText = showPrimaryOnly || showAddressAndChainName || showBalance || !!secondary;
        if (!shouldShowText) return null;
        const contentBaseClass = variant === 'feed'
          ? 'flex flex-col items-start min-w-0'
          : 'flex flex-col items-start min-w-0 px-[12px] pb-[20px]';
        const chainNameClass = variant === 'feed'
          ? 'chain-name text-[14px] md:text-sm font-bold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent'
          : 'chain-name text-[14px] md:text-[15px] font-bold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent';
        return (
          <div className={cn(contentBaseClass, contentClassName)}>
            {showPrimaryOnly ? (
              (() => {
                const displayName = chainName || (!hideFallbackName ? 'Legend' : '');
                return displayName ? (
                  <span
                    className="chain-name text-[14px] md:text-[15px] font-bold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent block truncate w-full"
                    title={displayName}
                  >
                    {displayName}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'text-sm font-bold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent leading-tight font-sans',
                      className,
                    )}
                    title={address}
                  >
                    {address ? `${address.slice(0, 6)}...${address.slice(-6)}` : ''}
                  </span>
                );
              })()
            ) : (
              showAddressAndChainName && (
              <>
                <span className={chainNameClass}>
                  {chainName || (hideFallbackName ? '' : 'Legend')}
                </span>
                <span className="text-xs text-white/70 font-mono leading-[0.9] no-gradient-text">
                  <AddressFormatted
                    address={address}
                    truncate={false}
                    truncateFixed={false}
                    className={className}
                  />
                </span>
              </>
              )
            )}
            <div>
              {showBalance && (
              <div className="text-sm font-bold text-white">
                {decimalBalance.prettify()}
                {' '}
                AE
              </div>
              )}
            </div>
            {secondary}
          </div>
        );
      })()}
    </>
  );

  return (
    <span className="relative inline-flex items-center" style={{ zIndex: 'auto' }}>
      <div
        ref={ref}
        className={cn('flex items-center cursor-pointer transition-colors hover:text-foreground', className)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={handleClick}
      >
        {renderContent()}
      </div>

      {/* Hover Card - Rendered as portal to avoid clipping */}
      {visible && createPortal(
        <AeCard
          ref={cardRef}
          variant="glow"
          className="min-w-[300px] max-w-[420px] shadow-card"
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            zIndex: 9999,
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <AeCardContent className="p-3">
            <div>
              <div className="flex gap-3 mb-3 align-center items-center">
                {renderContent()}

              </div>
              <div className="min-w-0 flex-1">
                {/* AE Balance */}
                {resolvedShowBalanceInHover && (
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-semibold">AE Balance: </span>
                  <span className="font-mono">{decimalBalance ? `${decimalBalance.prettify()} AE` : 'Loading...'}</span>
                </div>
                )}

                {/* Top 3 Token Holdings */}
                {aex9Balances.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <div className="font-semibold mb-1">Tokens Holdings:</div>
                  {aex9Balances
                    .sort((a, b) => {
                      // Calculate decimal values for comparison using Decimal library
                      const balanceA = a.amount && a.decimals
                        ? Decimal.from(a.amount).div(10 ** a.decimals)
                        : Decimal.from(0);
                      const balanceB = b.amount && b.decimals
                        ? Decimal.from(b.amount).div(10 ** b.decimals)
                        : Decimal.from(0);
                      // Sort descending (highest first)
                      return balanceB.gt(balanceA) ? 1 : balanceB.lt(balanceA) ? -1 : 0;
                    })
                    .slice(0, 3)
                    .map((token, index) => {
                      const balance = Decimal.from(token.amount).div(10 ** token.decimals).prettify();
                      return (
                        <div key={token.contract_id || index} className="flex justify-between items-center py-0.5">
                          <span className="font-medium max-w-[150px] overflow-hidden text-ellipsis">{token.symbol || token.token_symbol || token.token_name || 'Unknown'}</span>
                          <span className="font-mono text-xs">{balance}</span>
                        </div>
                      );
                    })}
                  {aex9Balances.length > 3 && (
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    +
                    {' '}
                    {aex9Balances.length - 3}
                    {' '}
                    more...
                  </div>
                  )}
                </div>
                )}
              </div>
            </div>
          </AeCardContent>
        </AeCard>,
        document.body,
      )}
    </span>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Always return false if address changes to force re-render and reload balance
  if (prevProps.address !== nextProps.address) {
    return false;
  }
  return prevProps.size === nextProps.size
        && prevProps.overlaySize === nextProps.overlaySize
        && prevProps.showPrimaryOnly === nextProps.showPrimaryOnly
        && prevProps.showAddressAndChainName === nextProps.showAddressAndChainName
        && prevProps.showBalance === nextProps.showBalance
        && prevProps.showBalanceInHover === nextProps.showBalanceInHover
        && prevProps.truncateAddress === nextProps.truncateAddress
        && prevProps.className === nextProps.className
        && prevProps.isHoverEnabled === nextProps.isHoverEnabled
        && prevProps.avatarBackground === nextProps.avatarBackground
        && prevProps.hideFallbackName === nextProps.hideFallbackName
        && prevProps.secondary === nextProps.secondary
        && prevProps.contentClassName === nextProps.contentClassName
        && prevProps.variant === nextProps.variant;
});

AddressAvatarWithChainName.displayName = 'AddressAvatarWithChainName';

export default AddressAvatarWithChainName;
