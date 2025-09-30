import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../hooks';
import { CONFIG } from '../config';
import AddressAvatar from './AddressAvatar';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { 
  formatAddress, 
  isAccountAddress, 
  prepareExplorerUrl, 
  copyToClipboard 
} from '../utils/address';

interface AddressChipProps {
  address: string;
  hideAvatar?: boolean;
  copyable?: boolean;
  linkToExplorer?: boolean;
  linkToProfile?: boolean;
  large?: boolean;
  prefix?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function AddressChip({
  address,
  hideAvatar = false,
  copyable = false,
  linkToExplorer = false,
  linkToProfile = false,
  large = false,
  prefix,
  className = '',
  style = {},
  onClick
}: AddressChipProps) {
  const navigate = useNavigate();
  const { activeAccount } = useAccount();
  const [textCopied, setTextCopied] = useState(false);
  
  const isActive = activeAccount === address;
  const isAccount = isAccountAddress(address);
  
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
    } else if (linkToProfile && isAccount) {
      navigate(`/users/${address}`);
    } else if (linkToExplorer && CONFIG.EXPLORER_URL) {
      const url = prepareExplorerUrl(address, CONFIG.EXPLORER_URL, prefix);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }, [address, copyable, linkToProfile, linkToExplorer, isAccount, navigate, prefix, onClick]);

  return (
    <Badge
      variant={isActive ? "default" : "secondary"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden font-semibold tracking-wide",
        large ? "px-4 py-2 text-sm gap-2" : "px-3 py-1.5 text-xs",
        isActive ? "bg-accent text-accent-foreground border-accent" : "bg-glass-bg border-glass-border text-foreground",
        !(copyable || linkToExplorer || linkToProfile || onClick) && "cursor-default hover:translate-y-0 hover:shadow-none",
        className
      )}
      style={style}
      onClick={handleChipClick}
      title={copyable ? 'Click to copy address' : linkToExplorer ? 'Click to view in explorer' : address}
    >
      {/* Avatar */}
      {!hideAvatar && (
        <div className="-ml-0.5">
          <AddressAvatar 
            address={address} 
            size={large ? 20 : 16}
          />
        </div>
      )}
      
      {/* Address text */}
      <span className={cn(
        "tracking-wide whitespace-nowrap",
        isAccount
          ? (large ? "text-xs font-light font-mono" : "text-[10px] font-light font-mono")
          : (large ? "text-sm font-semibold" : "text-xs font-semibold")
      )}>
        {formatAddress(address, large ? 8 : 6, true)}
      </span>
      
      {/* Copy icon */}
      {copyable && (
        <span className="opacity-70 text-xs">📋</span>
      )}
      
      {/* External link icon */}
      {linkToExplorer && !isAccount && (
        <span className="opacity-70 text-xs">🔗</span>
      )}
      
      {/* Copied feedback */}
      {textCopied && (
        <div className="absolute inset-0 bg-success text-white flex items-center justify-center text-xs font-bold rounded-full animate-pulse">
          Copied!
        </div>
      )}
    </Badge>
  );
}


export default AddressChip;