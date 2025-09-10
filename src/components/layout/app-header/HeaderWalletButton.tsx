import React from 'react';
import { useAccount } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import Favicon from '../../../svg/favicon.svg?react';
import Identicon from '../../Identicon';
import './HeaderWalletButton.scss';
import { formatAddress } from '../../../utils/address';
import AddressAvatar from '../../../components/AddressAvatar';

export default function HeaderWalletButton() {
  const { activeAccount } = useAeSdk();
  const { connectWallet, disconnectWallet, walletInfo } = useWalletConnect();
  const { decimalBalance, chainName } = useAccount();
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


  // If not connected, show connect button
  if (!walletInfo && !activeAccount) {
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
          <div className="address">{chainName ?? formatAddress(activeAccount)}</div>
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
              {
                chainName && (
                  <div className="chain-name">{chainName}</div>
                )
              }
              <div className="full-address" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {
                  chainName && (
                    <AddressAvatar address={activeAccount} size={24} />
                  )
                }
                {formatAddress(activeAccount)}
              </div>
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
