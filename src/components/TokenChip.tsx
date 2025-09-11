import React, { useState, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAeSdk } from "../hooks";
import { copyToClipboard } from '../utils/address';
import { DexTokenDto } from '../api/generated';
import { DEX_ADDRESSES } from '../libs/dex';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface TokenChipProps {
    address?: string;
    token?: DexTokenDto;
    copyable?: boolean;
    large?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    showAddress?: boolean;
    showName?: boolean;
}

export const TokenChip = ({
    address,
    token,
    copyable = false,
    large = false,
    className = '',
    style = {},
    onClick,
    showAddress = false,
    showName = true
}: TokenChipProps) => {
    const { activeNetwork } = useAeSdk();
    const [textCopied, setTextCopied] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['token', address],
        queryFn: () => fetch(`${activeNetwork.middlewareUrl}/v3/aex9/${address}`).then(res => res.json()),
        enabled: !!address,
    });

    const tokenData = token || data || null;

    const handleChipClick = useCallback(async () => {
        if (!tokenData) return;
        if (onClick) {
            onClick();
            return;
        }

        if (copyable) {
            const success = await copyToClipboard(tokenData.address);
            if (success) {
                setTextCopied(true);
                setTimeout(() => setTextCopied(false), 1000);
            }
        }
    }, [tokenData?.address, copyable, onClick]);

    const formatAddress = (addr: string, length: number = 6) => {
        if (!addr) return '';
        if (addr.length <= length * 2) return addr;
        return `${addr.slice(0, length)}...${addr.slice(-length)}`;
    };

    if (!tokenData) return null;

    return (
        <Badge
            variant="secondary"
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden font-semibold tracking-wide bg-glass-bg border-glass-border text-foreground",
                large ? "px-4 py-2 text-sm gap-2 min-h-9" : "px-3 py-1.5 text-xs min-h-7",
                !(copyable || onClick) && "cursor-default hover:translate-y-0 hover:shadow-none",
                className
            )}
            style={style}
            onClick={handleChipClick}
            title={copyable ? 'Click to copy token address' : data?.name || address}
        >
            {/* Token Symbol */}
            <span className={cn(
                "font-semibold tracking-wide",
                large ? "text-sm" : "text-xs"
            )}>
                {isLoading
                    ? '...' :
                    (
                        (tokenData?.address == DEX_ADDRESSES.wae || tokenData?.is_ae || address == DEX_ADDRESSES.wae)
                            ? 'AE'
                            : tokenData?.symbol
                            || 'TOKEN')}
            </span>

            {/* Token Name (if different from symbol) */}
            {showName && tokenData?.name && tokenData.name !== tokenData.symbol && (
                <span className={cn(
                    "font-normal opacity-70 truncate",
                    large ? "text-xs max-w-30" : "text-xs max-w-20"
                )}>
                    ({tokenData.name})
                </span>
            )}

            {/* Address (optional) */}
            {showAddress && (
                <span className={cn(
                    "font-mono font-normal opacity-60",
                    large ? "text-xs" : "text-xs"
                )}>
                    {formatAddress(tokenData.address, large ? 4 : 3)}
                </span>
            )}

            {/* Copy icon */}
            {copyable && (
                <span className="opacity-70 text-xs">📋</span>
            )}

            {/* Copied feedback */}
            {textCopied && (
                <div className="absolute inset-0 bg-success text-white flex items-center justify-center text-xs font-bold rounded-full animate-pulse">
                    Copied!
                </div>
            )}
        </Badge>
    );
};