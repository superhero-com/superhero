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
    <div className="grid gap-3">
      {/* Row 1: CTA card */}
      <TokenChat
        token={{
          name: token.name,
          address: token.address || token.contract_address,
        }}
        mode="ctaOnly"
      />

      {/* Row 2: Messages card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-[5px] min-h-[400px]">
        <TokenChat
          token={{
            name: token.name,
            address: token.address || token.contract_address,
          }}
          mode="messagesOnly"
        />
      </div>
    </div>
  );
}
