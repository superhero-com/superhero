import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';

export default function FeedbackButton() {
  const [isHovered, setIsHovered] = useState(false);
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClick = () => {
    if (isMobile && !showMobilePopup) {
      // On mobile, show popup first
      setShowMobilePopup(true);
    } else {
      // On desktop or after popup confirmation, open GitHub
      window.open('https://github.com/superhero-com/superhero/issues', '_blank', 'noopener,noreferrer');
      setShowMobilePopup(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(to right, var(--neon-teal), var(--neon-teal), #5eead4)',
          color: '#0a0a0f',
        }}
        aria-label="Send Feedback"
        title="Send Feedback"
      >
        <MessageSquare 
          className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'rotate-12' : ''}`}
          style={{ color: '#0a0a0f' }}
        />
        {isHovered && !isMobile && (
          <span 
            className="text-sm font-semibold whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-300"
            style={{ color: '#0a0a0f' }}
          >
            Send Feedback
          </span>
        )}
      </button>

      {/* Mobile Popup */}
      {showMobilePopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm md:hidden">
          <div className="bg-white/[0.95] rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowMobilePopup(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
                background: 'linear-gradient(to right, var(--neon-teal), var(--neon-teal), #5eead4)',
              }}>
                <MessageSquare className="w-6 h-6" style={{ color: '#0a0a0f' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Send Feedback</h3>
                <p className="text-sm text-gray-600">Help us improve Superhero</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-6">
              Found a bug or have a suggestion? Click below to report it on GitHub and help us make Superhero better!
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowMobilePopup(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.open('https://github.com/superhero-com/superhero/issues', '_blank', 'noopener,noreferrer');
                  setShowMobilePopup(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-all duration-300 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(to right, var(--neon-teal), var(--neon-teal), #5eead4)',
                  color: '#0a0a0f',
                }}
              >
                Open GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

