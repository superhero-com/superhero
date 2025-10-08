import React from 'react';
import TokenChat from './TokenChat';

interface CommentsListProps {
  token: {
    name?: string;
    address?: string;
    contract_address?: string;
  };
}

export default function CommentsList({ token }: CommentsListProps) {
  return (
    <div>
      {/* Info Banner */}
      <div className="mb-6 bg-white/[0.05] border border-white/10 rounded-xl p-4 backdrop-blur-[10px]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] flex items-center justify-center">
            <span className="text-white text-sm">💬</span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold text-sm mb-2">
              Community Comments
            </h4>
            <p className="text-white/70 text-xs leading-relaxed">
              Comments are powered by{' '}
              <a 
                href="https://quali.chat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#4ecdc4] hover:text-white transition-colors underline"
              >
                Quali.chat
              </a>
              . Click "Add message" to post in the public room; messages appear here shortly after.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Component */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 backdrop-blur-[5px] min-h-[400px]">
        <TokenChat 
          token={{ 
            name: token.name, 
            address: token.address || token.contract_address 
          }} 
        />
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-center">
        <div className="text-white/40 text-xs">
          Join the conversation and share your thoughts about this token
        </div>
      </div>
    </div>
  );
}
