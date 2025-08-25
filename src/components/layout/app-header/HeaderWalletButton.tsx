import React from 'react';
import { useWallet, useAeternity } from '../../../hooks';
import { deeplinkLogin } from '../../../auth/deeplink';
import Identicon from '../../Identicon';
import Favicon from '../../../svg/favicon.svg?react';
import './HeaderWalletButton.scss';

export default function HeaderWalletButton() {
  const { address, balance, chainNames } = useWallet();
  const { initSdk, scanForWallets, enableSdkWallet, logout } = useAeternity();
  const [loading, setLoading] = React.useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      try { await initSdk(); } catch {}
      const addr = await scanForWallets().catch(() => null);
      if (!addr) {
        // fallback to deeplink connect if Web Wallet not detected
        deeplinkLogin();
      } else {
        enableSdkWallet();
      }
    } finally {
      setLoading(false);
    }
  }
  const [showDropdown, setShowDropdown] = React.useState(false);



  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const chainName = address ? chainNames?.[address] : undefined;

  // If not connected, show connect button
  if (!address) {
    return (
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="header-wallet-button connect"
      >
        <span className="icon">
          <Favicon />
        </span>
        <span className="text">{loading ? 'Connecting…' : 'Connect Wallet'}</span>
      </button>
    );
  }

  // If connected, show user info with dropdown
  return (
    <div className="header-wallet-container">
      <button
        type="button"
        className="header-wallet-button connected"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="avatar">
          <Identicon address={address} size={32} name={chainName} />
        </div>
        <div className="wallet-info">
          <div className="address">{shortAddress}</div>
          <div className="balance">{Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AE</div>
        </div>
      </button>

      {showDropdown && (
        <div className="wallet-dropdown">
          <div className="dropdown-header">
            <div className="avatar-large">
              <Identicon address={address} size={40} name={chainName} />
            </div>
            <div className="user-info">
              <div className="chain-name">{chainName || 'My Wallet'}</div>
              <div className="full-address">{address}</div>
            </div>
          </div>
          <div className="dropdown-balance">
            <span className="balance-label">Balance:</span>
            <span className="balance-amount">{Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AE</span>
          </div>
          <div className="dropdown-actions">
            <button onClick={handleLogout} className="logout-btn">
              Disconnect
            </button>
          </div>
        </div>
      )}
      
      {showDropdown && (
        <div 
          className="dropdown-overlay" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
