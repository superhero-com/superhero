import { memo } from 'react';
import Identicon from '@/components/Identicon';
import AddressAvatar from '@/components/AddressAvatar';
import AddressFormatted from '@/components/AddressFormatted';
import { useChainName } from '@/hooks/useChainName';
import { cn } from '@/lib/utils';

interface AddressAvatarWithChainNameProps {
    address: string;
    size?: number;
    overlaySize?: number;
    showAddress?: boolean;
    truncateAddress?: boolean;
    className?: string;
}

export const AddressAvatarWithChainName = memo(({
    address,
    size = 36,
    overlaySize = 18,
    showAddress = true,
    truncateAddress = true,
    className
}: AddressAvatarWithChainNameProps) => {
    const { chainName } = useChainName(address);

    return (
        <div className={cn("flex items-center gap-3", className)}>
            {/* Avatar Section - Based on PostAvatar logic */}
            <div className="relative flex-shrink-0">
                <div className="relative">
                    {chainName ? (
                        <div className="relative">
                            <div className="rounded-xl overflow-hidden shadow-md">
                                <Identicon address={address} size={size} name={chainName} />
                            </div>
                            <div
                                className="absolute -bottom-1 -right-1 rounded border-2 border-background shadow-sm overflow-hidden"
                                style={{ width: `${overlaySize}px`, height: `${overlaySize}px` }}
                            >
                                <AddressAvatar address={address} size="100%" borderRadius="2px" />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl overflow-hidden shadow-md">
                            <AddressAvatar address={address} size={size} borderRadius="10px" />
                        </div>
                    )}
                </div>
            </div>

            {/* Address/ChainName Text Section - Styled like UserBadge */}
            {showAddress && (
                <div className="flex flex-col items-start min-w-0">
                    <span className="chain-name text-sm font-bold bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
                        <AddressFormatted
                            address={chainName ?? 'Fellow superhero'}
                            truncate={truncateAddress}
                            truncateFixed={false}
                        />
                    </span>
                    <span className="address text-xs font-mono tracking-wide underline decoration-muted-foreground/20 decoration-1 underline-offset-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] min-w-0 flex-shrink bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
                        <AddressFormatted
                            address={address}
                        />
                    </span>
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.address === nextProps.address &&
        prevProps.size === nextProps.size &&
        prevProps.overlaySize === nextProps.overlaySize &&
        prevProps.showAddress === nextProps.showAddress &&
        prevProps.truncateAddress === nextProps.truncateAddress;
});

AddressAvatarWithChainName.displayName = 'AddressAvatarWithChainName';

export default AddressAvatarWithChainName;