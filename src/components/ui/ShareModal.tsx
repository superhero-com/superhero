import React from 'react';
import { cn } from '../../lib/utils';
import CopyText from './CopyText';
import { Button } from './button';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title?: string;
}

export default function ShareModal({ 
  isOpen, 
  onClose, 
  shareUrl, 
  title = "Share Token" 
}: ShareModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={cn(
        "bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.1)]",
        "w-full max-w-md mx-auto",
        "transform transition-all duration-300 ease-out",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-white/60 mb-2">
              Share this token with others:
            </label>
            <CopyText 
              value={shareUrl} 
              className="w-full" 
              bordered={true} 
            />
          </div>
          
          {/* Social sharing buttons */}
          <div className="mb-4">
            <div className="text-sm font-medium text-white/60 mb-3">
              Share on social media:
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out this token!')}`)}
                className="flex-1 px-3 py-2 bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/30 transition-colors text-sm font-medium"
              >
                🐦 Twitter
              </button>
              <button
                onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out this token!')}`)}
                className="flex-1 px-3 py-2 bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] rounded-lg hover:bg-[#0088cc]/30 transition-colors text-sm font-medium"
              >
                ✈️ Telegram
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-6 py-2 rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
