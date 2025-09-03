import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../hooks';
import { CONFIG } from '../config';
import AddressAvatar from './AddressAvatar';
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

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: large ? 8 : 6,
    padding: large ? '8px 16px' : '6px 12px',
    borderRadius: 20,
    background: isActive ? 'var(--accent-color)' : 'var(--glass-bg)',
    border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--glass-border)'}`,
    color: isActive ? 'white' : 'var(--standard-font-color)',
    fontSize: large ? 14 : 12,
    fontWeight: 600,
    cursor: (copyable || linkToExplorer || linkToProfile || onClick) ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
    ...style
  };

  const hoverStyle = {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  };

  return (
    <div
      className={`address-chip ${className}`}
      style={chipStyle}
      onClick={handleChipClick}
      onMouseEnter={(e) => {
        if (copyable || linkToExplorer || linkToProfile || onClick) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        if (copyable || linkToExplorer || linkToProfile || onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      title={copyable ? 'Click to copy address' : linkToExplorer ? 'Click to view in explorer' : address}
    >
      {/* Avatar */}
      {!hideAvatar && (
        <AddressAvatar 
          address={address} 
          size={large ? 20 : 16}
          style={{ marginLeft: -2 }}
        />
      )}
      
      {/* Address text */}
      <span style={{ 
        fontSize: large ? 14 : 12,
        fontWeight: 600,
        letterSpacing: '0.25px'
      }}>
        {formatAddress(address, large ? 8 : 6)}
      </span>
      
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
      
      {/* External link icon */}
      {linkToExplorer && !isAccount && (
        <div style={{
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7
        }}>
          🔗
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
}


export default AddressChip;