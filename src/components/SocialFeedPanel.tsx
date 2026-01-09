import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Social Feed Panel - Floating notification-style panel
 * - Floating button with unread badge
 * - Expands to show social activity feed
 * - Auto-closes when clicking outside
 */

// Mock social feed data - replace with real API calls
const mockSocialFeed = [
  {
    id: 1,
    type: "tip",
    user: "alice.chain",
    action: "tipped",
    target: "bob.chain",
    amount: "10 AE",
    hashtag: "#Bitcoin",
    time: "2m ago",
    avatar: "🦊",
  },
  {
    id: 2,
    type: "comment",
    user: "crypto_whale",
    action: "commented on",
    target: "#Ethereum",
    content: "This is bullish! 🚀",
    time: "5m ago",
    avatar: "🐋",
  },
  {
    id: 3,
    type: "follow",
    user: "defi_master",
    action: "started following",
    target: "you",
    time: "12m ago",
    avatar: "🧙",
  },
  {
    id: 4,
    type: "post",
    user: "nft_artist",
    action: "posted about",
    target: "#NFTs",
    content: "New collection dropping soon...",
    time: "18m ago",
    avatar: "🎨",
  },
  {
    id: 5,
    type: "tip",
    user: "generous_giver",
    action: "tipped",
    target: "content_creator",
    amount: "50 AE",
    hashtag: "#Aeternity",
    time: "25m ago",
    avatar: "💎",
  },
  {
    id: 6,
    type: "like",
    user: "moon_boy",
    action: "liked your post about",
    target: "#DeFi",
    time: "32m ago",
    avatar: "🌙",
  },
];

export default function SocialFeedPanel() {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setUnreadCount(0), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Simulate new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        setUnreadCount(prev => Math.min(prev + 1, 9));
      }
    }, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [isOpen]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "tip": return "🎁";
      case "comment": return "💬";
      case "follow": return "👋";
      case "post": return "📝";
      case "like": return "❤️";
      default: return "📣";
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "tip": return "#10B981";
      case "comment": return "#06B6D4";
      case "follow": return "#8B5CF6";
      case "post": return "#F59E0B";
      case "like": return "#EF4444";
      default: return "#6B7280";
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-24 right-6 z-[999]
          w-14 h-14 rounded-full
          flex items-center justify-center
          shadow-lg transition-all duration-300
          hover:scale-110 active:scale-95
          ${isOpen ? 'rotate-12' : ''}
        `}
        style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
          boxShadow: isOpen 
            ? '0 8px 32px rgba(139, 92, 246, 0.5)' 
            : '0 4px 20px rgba(139, 92, 246, 0.4)',
        }}
        aria-label="Social Feed"
      >
        {/* Icon */}
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse"
            style={{ boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Feed Panel */}
      <div
        ref={panelRef}
        className={`
          fixed bottom-24 right-24 z-[998]
          w-80 max-h-[70vh]
          rounded-2xl overflow-hidden
          shadow-2xl
          transition-all duration-300 ease-out
          ${isOpen 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          }
        `}
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: isDark 
            ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15)'
            : '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 40px rgba(139, 92, 246, 0.1)',
        }}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            borderColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Social Feed
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-500/20 text-violet-400">
                {unreadCount} new
              </span>
            )}
          </div>
          <Link
            to="/social"
            onClick={() => setIsOpen(false)}
            className="text-xs font-medium text-violet-400 hover:text-violet-300 no-underline"
          >
            View all →
          </Link>
        </div>

        {/* Feed Items */}
        <div className="overflow-y-auto max-h-[calc(70vh-120px)]">
          {mockSocialFeed.map((item, index) => (
            <div
              key={item.id}
              className={`
                px-4 py-3 border-b transition-colors duration-200 cursor-pointer
                ${isDark 
                  ? 'border-slate-800 hover:bg-slate-800/50' 
                  : 'border-gray-100 hover:bg-gray-50'
                }
                ${index < unreadCount ? (isDark ? 'bg-violet-500/10' : 'bg-violet-50') : ''}
              `}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ 
                    background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                  }}
                >
                  {item.avatar}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1 flex-wrap">
                    <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      @{item.user}
                    </span>
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {item.action}
                    </span>
                    <span 
                      className="font-medium text-sm"
                      style={{ color: getActionColor(item.type) }}
                    >
                      {item.target}
                    </span>
                  </div>

                  {/* Extra content */}
                  {item.content && (
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      "{item.content}"
                    </p>
                  )}
                  {item.amount && (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-400 mt-1">
                      💰 {item.amount}
                    </span>
                  )}

                  {/* Time and type */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs" style={{ color: getActionColor(item.type) }}>
                      {getActionIcon(item.type)}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {item.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div 
          className="px-4 py-3 border-t"
          style={{
            borderColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)',
          }}
        >
          <Link
            to="/social"
            onClick={() => setIsOpen(false)}
            className={`
              w-full flex items-center justify-center gap-2 py-2 rounded-xl
              font-medium text-sm transition-all duration-200
              no-underline
            `}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              color: 'white',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            Open Full Feed
          </Link>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[997] bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

