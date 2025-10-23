import { useAppKit, useDisconnect, useAppKitAccount } from '@reown/appkit/react';

interface ConnectEthereumWalletProps {
    onConnected?: (accounts: string[]) => void;
    onDisconnected?: () => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    className?: string;
    label?: string;
    showConnectedState?: boolean;
}

export function ConnectEthereumWallet({ 
    onConnected, 
    onDisconnected,
    onError,
    disabled = false,
    className = '',
    label = 'Connect Ethereum Wallet',
    showConnectedState = false
}: ConnectEthereumWalletProps) {
    const { open } = useAppKit();
    const { disconnect } = useDisconnect();
    const { address: ethAddress, isConnected } = useAppKitAccount();

    const handleConnect = async () => {
        try {
            await open();
        } catch (error: any) {
            console.error('Failed to open wallet modal:', error);
            if (onError) {
                onError(error.message || 'Failed to connect wallet');
            }
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnect();
            if (onDisconnected) {
                onDisconnected();
            }
        } catch (error: any) {
            console.error('Failed to disconnect wallet:', error);
            if (onError) {
                onError(error.message || 'Failed to disconnect wallet');
            }
        }
    };

    // If showing connected state and wallet is connected
    if (showConnectedState && isConnected && ethAddress) {
        return (
            <div className="w-full bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-[10px]">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white/60 font-medium uppercase tracking-wider">
                        Ethereum Wallet
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-green-400">Connected</span>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white/80 font-mono flex-1 truncate">
                        {ethAddress.slice(0, 10)}...{ethAddress.slice(-8)}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleConnect}
                            className="text-xs text-[#4ecdc4] hover:text-[#3ab3aa] bg-[#4ecdc4]/10 hover:bg-[#4ecdc4]/20 border border-[#4ecdc4]/30 hover:border-[#4ecdc4]/50 rounded-lg px-2 py-1 transition-all duration-200 font-medium"
                        >
                            Switch
                        </button>
                        <button
                            onClick={handleDisconnect}
                            className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 hover:border-red-400/50 rounded-lg px-2 py-1 transition-all duration-200 font-medium"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default: show connect button
    return (
        <button
            onClick={handleConnect}
            disabled={disabled}
            className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-2xl border-none text-white cursor-pointer text-sm sm:text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                disabled
                    ? 'bg-white/10 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-[#627eea] to-[#8a92b2] shadow-[0_8px_25px_rgba(98,126,234,0.4)] hover:shadow-[0_12px_35px_rgba(98,126,234,0.5)] hover:-translate-y-0.5 active:translate-y-0'
            } ${className}`}
        >
            {label}
        </button>
    );
}

export default ConnectEthereumWallet;