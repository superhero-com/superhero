import React, { useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import AeButton from '../AeButton';
import ConnectWalletButton from '../ConnectWalletButton';
import { useWallet, useAeternity } from '../../hooks';
import Identicon from '../Identicon';
import { useToast } from '../ToastProvider';
import { getTokenBalance, fromAettos, DEX_ADDRESSES } from '../../libs/dex';
import { CONFIG } from '../../config';
import { priceAtSupplyAE } from '../../utils/bondingCurve';

type Currency = 'usd' | 'eur' | 'cny';

type Props = {
  prices?: Record<string, number> | null;
  selectedCurrency?: Currency;
};

type TokenBalance = {
  symbol: string;
  balance: string;
  price: number;
  change24h: number;
  address: string;
  decimals: number;
  name: string;
};

export default function WalletCard({ prices, selectedCurrency = 'usd' }: Props) {
  const toast = useToast();
  const { address, balance, chainNames } = useWallet();
  const { logout, refreshAeBalance } = useAeternity();

  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    return formatter.format(price);
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'var(--neon-green)';
    if (change < 0) return 'var(--neon-pink)';
    return '#94a3b8';
  };

  const fetchRealTokenBalances = async (akAddress: string): Promise<TokenBalance[]> => {
    try {
      const base = (CONFIG.MIDDLEWARE_URL || '').replace(/\/$/, '');
      if (base) {
        try {
          const tokensFromMdw: Array<{ address: string; symbol: string; name: string; decimals: number; balance: string }>=[];
          let cursor: string | null = `/v3/accounts/${akAddress}/aex9/balances`;
          let guard = 0;
          while (cursor && guard++ < 20) {
            const r = await fetch(`${base}${cursor.startsWith('/') ? '' : '/'}${cursor}`, { cache: 'no-cache' });
            if (!r.ok) break;
            const mdw = await r.json();
            const items: any[] = Array.isArray(mdw?.data) ? mdw.data : [];
            for (const it of items) {
              const ct = it?.contract_id;
              const bal = it?.amount ?? it?.balance;
              const decs = Number(it?.decimals ?? 18);
              const sym = it?.token_symbol || it?.symbol || 'TKN';
              const nm = it?.token_name || it?.name || sym;
              if (ct && (bal != null)) {
                try {
                  const bn = typeof bal === 'bigint'
                    ? bal
                    : BigInt(new BigNumber(String(bal)).integerValue(BigNumber.ROUND_DOWN).toFixed(0));
                  if (bn > 0n) {
                    tokensFromMdw.push({ address: String(ct), symbol: String(sym), name: String(nm), decimals: decs, balance: fromAettos(bn, decs) });
                  }
                } catch {}
              }
            }
            cursor = mdw?.next || null;
          }
          if (tokensFromMdw.length) {
            const map = new Map<string, { address: string; symbol: string; name: string; decimals: number; balance: string }>();
            for (const t of tokensFromMdw) {
              const prev = map.get(t.address);
              if (!prev) map.set(t.address, t); else {
                const higher = new BigNumber(t.balance).isGreaterThan(prev.balance) ? t.balance : prev.balance;
                map.set(t.address, { ...prev, balance: higher });
              }
            }
            const sdk: any = (window as any).__aeSdk;
            const pricePerAe = prices?.[selectedCurrency] || 0;
            const enriched = await Promise.all(Array.from(map.values()).map(async (t) => {
              let priceFiat = 0;
              if (sdk) {
                try {
                  const tokenContract = await sdk.initializeContract({ 
                    aci: { functions: [ 
                      { name: 'meta_info', arguments: [], returns: { record: [ { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'decimals', type: 'int' } ] } },
                      { name: 'total_supply', arguments: [], returns: 'int' },
                    ] }, 
                    address: t.address 
                  });
                  const { decodedResult: ts } = await tokenContract.total_supply();
                  const totalSupply = new BigNumber(String(ts ?? '0'));
                  if (t.address === DEX_ADDRESSES.wae) {
                    priceFiat = pricePerAe;
                  } else {
                    const priceAe = priceAtSupplyAE(totalSupply, t.decimals);
                    priceFiat = priceAe * pricePerAe;
                  }
                } catch {}
              }
              return {
                symbol: t.symbol,
                name: t.name,
                decimals: t.decimals,
                address: t.address,
                balance: t.balance,
                price: priceFiat,
                change24h: 0,
              } as TokenBalance;
            }));
            return enriched;
          }
        } catch {}
      }

      const sdk = (window as any).__aeSdk;
      if (!sdk) return [];
      const commonTokens = [
        { address: DEX_ADDRESSES.wae, symbol: 'WAE', name: 'Wrapped AE', decimals: 18 },
      ];
      const balancePromises = commonTokens.map(async (token) => {
        try {
          const balance = await getTokenBalance(sdk, token.address, akAddress);
          const balanceInTokens = fromAettos(balance, token.decimals);
          if (Number(balanceInTokens) > 0) {
            let realSymbol = token.symbol;
            let realName = token.name;
            let realDecimals = token.decimals;
            try {
              const tokenContract = await sdk.initializeContract({ 
                aci: { functions: [ { name: 'meta_info', arguments: [], returns: { record: [ { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'decimals', type: 'int' } ] } } ] }, 
                address: token.address 
              });
              const { decodedResult } = await tokenContract.meta_info();
              if (decodedResult) {
                realName = decodedResult.name || token.name;
                realSymbol = decodedResult.symbol || token.symbol;
                realDecimals = Number(decodedResult.decimals) || token.decimals;
              }
            } catch {}
            const pricePerAe = prices?.[selectedCurrency] || 0;
            return { symbol: realSymbol, balance: balanceInTokens, price: pricePerAe, change24h: 0, address: token.address, decimals: realDecimals, name: realName };
          }
          return null;
        } catch { return null; }
      });
      const balances = await Promise.all(balancePromises);
      return balances.filter((b): b is TokenBalance => b != null);
    } catch (error) {
      console.error('Failed to fetch token balances:', error);
      return [];
    }
  };

  const handleRefreshBalance = async () => {
    if (!address) return;
    setIsRefreshingBalance(true);
    try {
      await refreshAeBalance();
      const mdwBalances = await fetchRealTokenBalances(address);
      setTokenBalances(mdwBalances);
      toast.push(<>Balance refreshed successfully!</>);
    } catch (error: any) {
      console.error('Failed to refresh balance:', error);
      toast.push(<>Failed to refresh balance. Please try again.</>);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.push(<>Wallet disconnected successfully!</>);
  };

  useEffect(() => {
    if (address) {
      refreshAeBalance();
      fetchRealTokenBalances(address).then(setTokenBalances).catch(() => setTokenBalances([]));
    }
  }, [address, refreshAeBalance]);

  useEffect(() => {
    if (showWalletDetails && address && tokenBalances.length === 0) {
      fetchRealTokenBalances(address).then(setTokenBalances).catch(() => {});
    }
  }, [showWalletDetails, address]);

  return (
    <div className="genz-card wallet-section">
      <div className="card-header">
        <span className="card-icon">👛</span>
        <h4>Wallet</h4>
        <button 
          className="details-toggle"
          onClick={() => setShowWalletDetails(!showWalletDetails)}
          title="Show wallet details"
        >
          {showWalletDetails ? '▼' : '▶'}
        </button>
      </div>
      {address ? (
        <div className="wallet-content">
          <div className="wallet-header">
            <div className="wallet-avatar">
              <Identicon address={address} size={40} />
              <div className="online-indicator" />
            </div>
            <div className="wallet-info">
              <div className="wallet-name">{chainNames?.[address] || 'My Wallet'}</div>
              <div className="wallet-address">{address.slice(0, 8)}...{address.slice(-6)}</div>
            </div>
          </div>
          <div className="balance-section">
            <div className="balance-header">
              <span>Total Balance</span>
              <button 
                className="refresh-btn"
                onClick={handleRefreshBalance}
                disabled={isRefreshingBalance}
              >
                {isRefreshingBalance ? '🔄' : '🔄'}
              </button>
            </div>
            <div className="balance-amount">
              {Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AE
            </div>
            <div className="balance-fiat">
              ≈ {formatPrice(Number(balance || 0) * (prices?.[selectedCurrency] || 0), selectedCurrency)}
            </div>
          </div>
          {showWalletDetails && (
            <div className="wallet-details">
              <div className="token-balances">
                <h5>Token Balances</h5>
                {tokenBalances.length > 0 ? (
                  <div className="token-list">
                    {tokenBalances.slice(0, 5).map((token, index) => (
                      <div key={index} className="token-item">
                        <div className="token-info">
                          <span className="token-symbol">{token.symbol}</span>
                          <span className="token-name">{token.name}</span>
                          <span className="token-balance">{Number(token.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        </div>
                        <div className="token-price">
                          {token.price > 0 ? (
                            <>
                              <span className="price-amount">{formatPrice(token.price, selectedCurrency)}</span>
                              <span className="price-change" style={{ color: getPriceChangeColor(token.change24h) }}>
                                {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                              </span>
                            </>
                          ) : (
                            <span className="no-price">No price data</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {tokenBalances.length > 5 && (
                      <div className="token-more">
                        <span>+{tokenBalances.length - 5} more tokens</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-tokens"><span>No tokens found</span></div>
                )}
              </div>
              <div className="wallet-actions">
                <AeButton onClick={handleLogout} className="logout-btn">Disconnect</AeButton>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ConnectWalletButton block label="Connect Wallet" />
      )}
    </div>
  );
}


