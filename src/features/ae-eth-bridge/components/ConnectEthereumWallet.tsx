import { useCallback, useEffect } from 'react';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { Button } from '@/components/ui/button';
import { Logger } from '../utils/logger';

interface ConnectEthereumWalletProps {
    onConnected: (accounts: string[]) => void;
    onDisconnected?: () => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    className?: string;
}

export default function ConnectEthereumWallet({ 
    onConnected, 
    onDisconnected,
    onError,
    disabled = false,
    className = ''
}: ConnectEthereumWalletProps) {
    const { open } = useAppKit();
    const { address: ethereumAddress } = useAppKitAccount();
    const { disconnect } = useDisconnect();

    const handleConnect = useCallback(() => {
        try {
            open({
                view: 'Connect',
            });
        } catch (error: any) {
            Logger.error('Error opening AppKit:', error);
            onError?.(error.message || 'Failed to open wallet connection');
        }
    }, [open, onError]);

    const handleDisconnect = useCallback(async () => {
        try {
            await disconnect();
            Logger.log('Ethereum wallet disconnected via AppKit');
            onDisconnected?.();
        } catch (error: any) {
            Logger.error('Error disconnecting wallet:', error);
            onError?.(error.message || 'Failed to disconnect wallet');
        }
    }, [disconnect, onDisconnected, onError]);

    // Watch for address changes and notify parent
    useEffect(() => {
        if (ethereumAddress) {
            Logger.log('Ethereum wallet connected via AppKit:', ethereumAddress);
            onConnected([ethereumAddress]);
        } else {
            // Address is null/undefined, wallet disconnected
            onDisconnected?.();
        }
    }, [ethereumAddress, onConnected, onDisconnected]);

    // Show different UI based on connection state
    if (ethereumAddress) {
        return (
            <button
                onClick={handleDisconnect}
                disabled={disabled}
                className={`text-xs text-red-400 hover:text-red-300 transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${className}`}
            >
                Disconnect
            </button>
        );
    }

    return (
        <Button
            onClick={handleConnect}
            disabled={disabled}
            className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-2xl border-none text-white cursor-pointer text-sm sm:text-base font-bold tracking-wider transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                disabled
                    ? 'bg-white/10 cursor-not-allowed opacity-60'
                    : 'bg-black hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0'
            } ${className}`}
        >
            Connect Ethereum Wallet
        </Button>
    );
}
