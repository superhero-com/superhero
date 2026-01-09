import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAeSdk } from "../../hooks/useAeSdk";
import { useAccountBalances } from "../../hooks/useAccountBalances";
import { useWallet } from "../../hooks";
import AddressAvatarWithChainName from "../../@components/Address/AddressAvatarWithChainName";
import ConnectWalletButton from "../ConnectWalletButton";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * UserProfileChip - Swiss Minimal Design
 * - Clean borders, no rounded corners
 * - Minimal color palette
 * - Typography-focused
 */

interface UserProfileChipProps {
  showOnlyWhenConnected?: boolean;
}

export default function UserProfileChip({ showOnlyWhenConnected = false }: UserProfileChipProps) {
  const navigate = useNavigate();
  const { activeAccount } = useAeSdk();
  const { decimalBalance } = useAccountBalances(activeAccount);
  const { chainNames } = useWallet();
  const { isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const chainName = activeAccount ? chainNames?.[activeAccount] : null;
  const displayName = chainName || (activeAccount ? `${activeAccount.slice(0, 8)}...` : null);
  const balanceAe = Number(decimalBalance?.toString() || 0);

  // Swiss colors
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#71717A' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const bgColor = isDark ? '#09090B' : '#FFFFFF';
  const hoverBg = isDark ? '#18181B' : '#F4F4F5';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  if (!activeAccount) {
    // If showOnlyWhenConnected, return null (Connect button is in sidebar)
    if (showOnlyWhenConnected) return null;
    return <ConnectWalletButton />;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 transition-colors"
        style={{
          background: hoverBg,
          border: `1px solid ${borderColor}`,
        }}
      >
        <AddressAvatarWithChainName
          address={activeAccount}
          size={28}
          overlaySize={14}
          showBalance={false}
          showAddressAndChainName={false}
          showPrimaryOnly={true}
          hideFallbackName={true}
          isHoverEnabled={false}
        />
        <div className="hidden sm:flex flex-col items-start min-w-0">
          <span 
            className="text-xs font-medium truncate max-w-[140px]"
            style={{ color: textPrimary }}
          >
            {displayName}
          </span>
          <span 
            className="text-[10px]"
            style={{ color: textSecondary }}
          >
            {balanceAe.toLocaleString(undefined, { maximumFractionDigits: 2 })} AE
          </span>
        </div>
        <svg
          className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke={textSecondary}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 p-3 z-50 shadow-lg"
          style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
          }}
        >
          {/* User Info */}
          <div 
            className="pb-3 mb-3"
            style={{ borderBottom: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center gap-3">
              <AddressAvatarWithChainName
                address={activeAccount}
                size={40}
                overlaySize={20}
                showBalance={false}
                showAddressAndChainName={false}
                showPrimaryOnly={true}
                hideFallbackName={true}
                isHoverEnabled={false}
              />
              <div className="flex-1 min-w-0">
                <div 
                  className="text-sm font-medium truncate"
                  style={{ color: textPrimary }}
                >
                  {chainName || `${activeAccount.slice(0, 12)}...`}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: textSecondary }}
                >
                  {balanceAe.toLocaleString(undefined, { maximumFractionDigits: 4 })} AE
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                navigate(`/users/${activeAccount}`);
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
              style={{ color: textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = hoverBg;
                e.currentTarget.style.color = textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = textSecondary;
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>View Profile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(activeAccount);
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
              style={{ color: textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = hoverBg;
                e.currentTarget.style.color = textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = textSecondary;
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Address</span>
            </button>
            <a
              href={`https://www.aescan.io/accounts/${activeAccount}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDropdownOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm no-underline transition-colors"
              style={{ color: textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = hoverBg;
                e.currentTarget.style.color = textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = textSecondary;
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>View on aeScan</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
