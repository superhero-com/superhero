import React from 'react';
import { useWallet, useAeternity, useAccount } from '../../../hooks';
import { deeplinkLogin } from '../../../auth/deeplink';
import Identicon from '../../Identicon';
import Favicon from '../../../svg/favicon.svg?react';
import './HeaderWalletButton.scss';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import { useAeSdk } from '../../../hooks/useAeSdk';

export default function HeaderWalletButton() {
  const { activeAccount } = useAeSdk();
  const { connectWallet, disconnectWallet, walletInfo} = useWalletConnect();
  const { decimalBalance } = useAccount();
  // const { address, balance, chainNames } = useWallet();
  // const { initSdk, scanForWallets, enableSdkWallet, logout } = useAeternity();
  const [loading, setLoading] = React.useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      await connectWallet();
    } finally {
      setLoading(false);
    }
  }
  const [showDropdown, setShowDropdown] = React.useState(false);



  const handleLogout = () => {
    disconnectWallet();
    setShowDropdown(false);
  };

  const shortAddress = activeAccount ? `${activeAccount.slice(0, 6)}...${activeAccount.slice(-4)}` : '';
  const chainName = activeAccount ? activeAccount : undefined;

  // If not connected, show connect button
  if (!walletInfo) {
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
          <Identicon address={activeAccount} size={32} name={chainName} />
        </div>
        <div className="wallet-info">
          <div className="address">{shortAddress}</div>
          <div className="balance">{decimalBalance.prettify()} AE</div>
        </div>
      </button>

      {showDropdown && (
        <div className="wallet-dropdown">
          <div className="dropdown-header">
            <div className="avatar-large">
              <Identicon address={activeAccount} size={40} name={chainName} />
            </div>
            <div className="user-info">
              <div className="chain-name">{chainName || 'My Wallet'}</div>
              <div className="full-address">{activeAccount}</div>
            </div>
          </div>
          <div className="dropdown-balance">
            <span className="balance-label">Balance:</span>
            <span className="balance-amount">{decimalBalance.prettify()} AE</span>
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
