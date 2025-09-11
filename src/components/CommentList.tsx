import React from 'react';

export type Comment = { id: string; text: string; author?: string; createdAt?: string };

export default function CommentList({ comments }: { comments: Comment[] }) {
  if (!comments?.length) return <div className="text-white/70">There are no comments at the moment.</div>;
  return (
    <div className="grid gap-3">
      {comments.map((c) => (
        <div key={c.id} className="grid grid-cols-[36px_1fr] gap-2">
          <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full"></div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-white text-sm">{c.author || 'user'}</div>
            <div className="text-white/90 text-sm leading-relaxed">{c.text}</div>
            {c.createdAt && (
              <div className="text-white/60 text-xs">
                {new Date(c.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


