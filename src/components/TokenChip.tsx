import React, { useState, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAeSdk } from "../hooks";
import { copyToClipboard } from '../utils/address';

interface TokenChipProps {
    address: string;
    copyable?: boolean;
    large?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    showAddress?: boolean;
}

export const TokenChip = ({ 
    address, 
    copyable = false,
    large = false,
    className = '',
    style = {},
    onClick,
    showAddress = false
}: TokenChipProps) => {
    const { activeNetwork } = useAeSdk();
    const [textCopied, setTextCopied] = useState(false);
    
    const { data, isLoading } = useQuery({
        queryKey: ['token', address],
        queryFn: () => fetch(`${activeNetwork.middlewareUrl}/v3/aex9/${address}`).then(res => res.json()),
    });

    const handleChipClick = useCallback(async () => {
        if (onClick) {
            onClick();
            return;
        }
        
        if (copyable) {
            const success = await copyToClipboard(address);
            if (success) {
                setTextCopied(true);
                setTimeout(() => setTextCopied(false), 1000);
            }
        }
    }, [address, copyable, onClick]);

    const chipStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: large ? 8 : 6,
        padding: large ? '8px 16px' : '6px 12px',
        borderRadius: 20,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        color: 'var(--standard-font-color)',
        fontSize: large ? 14 : 12,
        fontWeight: 600,
        cursor: (copyable || onClick) ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: large ? 36 : 28,
        ...style
    };

    const hoverStyle = {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    };

    const formatAddress = (addr: string, length: number = 6) => {
        if (!addr) return '';
        if (addr.length <= length * 2) return addr;
        return `${addr.slice(0, length)}...${addr.slice(-length)}`;
    };

    return (
        <div
            className={`token-chip ${className}`}
            style={chipStyle}
            onClick={handleChipClick}
            onMouseEnter={(e) => {
                if (copyable || onClick) {
                    Object.assign(e.currentTarget.style, hoverStyle);
                }
            }}
            onMouseLeave={(e) => {
                if (copyable || onClick) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }
            }}
            title={copyable ? 'Click to copy token address' : data?.name || address}
        >
            {/* Token Symbol */}
            <span style={{ 
                fontSize: large ? 14 : 12,
                fontWeight: 600,
                letterSpacing: '0.25px'
            }}>
                {isLoading ? '...' : (data?.symbol || 'TOKEN')}
            </span>

            {/* Token Name (if different from symbol) */}
            {data?.name && data.name !== data.symbol && (
                <span style={{
                    fontSize: large ? 12 : 10,
                    fontWeight: 400,
                    opacity: 0.7,
                    maxWidth: large ? 120 : 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    ({data.name})
                </span>
            )}
            
            {/* Address (optional) */}
            {showAddress && (
                <span style={{
                    fontSize: large ? 11 : 9,
                    fontWeight: 400,
                    opacity: 0.6,
                    fontFamily: 'monospace'
                }}>
                    {formatAddress(address, large ? 4 : 3)}
                </span>
            )}
            
            {/* Copy icon */}
            {copyable && (
                <div style={{
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7
                }}>
                    📋
                </div>
            )}
            
            {/* Copied feedback */}
            {textCopied && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'var(--success-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 20,
                    animation: 'fadeInOut 1s ease-in-out'
                }}>
                    Copied!
                </div>
            )}
            
            <style>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.8); }
                }
            `}</style>
        </div>
    );
};