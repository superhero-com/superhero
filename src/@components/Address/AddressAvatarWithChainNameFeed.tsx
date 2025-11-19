import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AddressAvatar from '@/components/AddressAvatar';
import AddressFormatted from '@/components/AddressFormatted';
import { AeCard, AeCardContent } from '@/components/ui/ae-card';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { useChainName } from '@/hooks/useChainName';
import { cn } from '@/lib/utils';
import { Decimal } from '@/libs/decimal';

interface AddressAvatarWithChainNameFeedProps {
    address: string;
    size?: number;
    overlaySize?: number;
    showAddressAndChainName?: boolean;
    showBalance?: boolean;
    truncateAddress?: boolean;
    className?: string;
    isHoverEnabled?: boolean;
    avatarBackground?: boolean;
    hideFallbackName?: boolean;
    secondary?: React.ReactNode;
    contentClassName?: string;
}


export const AddressAvatarWithChainNameFeed = memo(({
    address,
    size = 36,
    overlaySize = 18,
    showAddressAndChainName = true,
    showBalance = false,
    truncateAddress = false,
    className,
    isHoverEnabled = true,
    avatarBackground = false,
    hideFallbackName = false,
    secondary,
    contentClassName
}: AddressAvatarWithChainNameFeedProps) => {
    const navigate = useNavigate();
    const { decimalBalance, aex9Balances, loadAccountData } = useAccountBalances(address);
    const { chainName } = useChainName(address);

    const [hover, setHover] = useState(false);
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLDivElement | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const updatePosition = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
            });
        }
    };

    useEffect(() => {
        if (!hover || !isHoverEnabled) {
            setVisible(false);
            return;
        }
        updatePosition();
        const id = window.setTimeout(() => setVisible(true), 300);
        return () => window.clearTimeout(id);
    }, [hover, isHoverEnabled]);

    // Start loading data immediately when hover starts (not when card becomes visible)
    // This way data is loading/loaded by the time the 300ms delay expires
    useEffect(() => {
        if (!address) return;
        if (showBalance || hover) {
            loadAccountData();
        }
    }, [address, showBalance, hover, loadAccountData]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/users/${address}`);
    };

    const renderContent = () => (
        <>
            <div className="relative flex-shrink-0">
                <div className="relative">
                    <div className="rounded-full overflow-hidden shadow-md">
                        <AddressAvatar address={address} size={size} borderRadius="50%" />
                    </div>
                </div>
            </div>

            <div className={cn("flex flex-col items-start min-w-0", contentClassName)}>
                {showAddressAndChainName && (
                    <>
                        <span className="chain-name text-[14px] md:text-sm font-bold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent">
                            {chainName || 'Legend'}
                        </span>
                        <span className="text-xs text-white/70 font-mono leading-[0.9]">
                            <AddressFormatted
                                address={address}
                                truncate={false}
                                className={className}
                            />
                        </span>
                    </>
                )}
                {secondary}
            </div>
        </>
    )

    return (
        <span className="relative inline-flex items-center" style={{ zIndex: 'auto' }}>
            <div
                ref={ref}
                className={cn("flex items-center cursor-pointer transition-colors hover:text-foreground", className)}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={handleClick}
            >
                {renderContent()}
            </div>

            {visible && createPortal(
                <AeCard
                    ref={cardRef}
                    variant="glow"
                    className="min-w-[300px] max-w-[420px] shadow-card"
                    style={{ position: 'absolute', top: position.top, left: position.left, zIndex: 9999 }}
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                >
                    <AeCardContent className="p-3">
                        <div>
                            <div className="flex gap-3 mb-3 align-center items-center">
                                {renderContent()}
                            </div>
                            <div className="min-w-0 flex-1">
                                {showBalance && (
                                    <div className="text-xs text-muted-foreground mb-2">
                                        <span className="font-semibold">AE Balance: </span>
                                        <span className="font-mono">{decimalBalance ? `${decimalBalance.prettify()} AE` : 'Loading...'}</span>
                                    </div>
                                )}
                                {aex9Balances.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                        <div className="font-semibold mb-1">Tokens Holdings:</div>
                                        {aex9Balances
                                            .sort((a, b) => {
                                                const balanceA = a.amount && a.decimals ? Decimal.from(a.amount).div(10 ** a.decimals) : Decimal.from(0);
                                                const balanceB = b.amount && b.decimals ? Decimal.from(b.amount).div(10 ** b.decimals) : Decimal.from(0);
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
                                                + {aex9Balances.length - 3} more...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </AeCardContent>
                </AeCard>,
                document.body
            )}
        </span>
    );
}, (prevProps, nextProps) => {
    return prevProps.address === nextProps.address &&
        prevProps.size === nextProps.size &&
        prevProps.overlaySize === nextProps.overlaySize &&
        prevProps.truncateAddress === nextProps.truncateAddress &&
        prevProps.secondary === nextProps.secondary &&
        prevProps.contentClassName === nextProps.contentClassName;
});

AddressAvatarWithChainNameFeed.displayName = 'AddressAvatarWithChainNameFeed';

export default AddressAvatarWithChainNameFeed;


