import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';

export default function FeedbackButton() {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open('https://github.com/superhero-com/superhero/issues', '_blank', 'noopener,noreferrer');
  };

  return (
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
      {isHovered && (
        <span 
          className="text-sm font-semibold whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-300"
          style={{ color: '#0a0a0f' }}
        >
          Send Feedback
        </span>
      )}
    </button>
  );
}

