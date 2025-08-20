import React from 'react';

export type Comment = { id: string; text: string; author?: string; createdAt?: string };

export default function CommentList({ comments }: { comments: Comment[] }) {
  if (!comments?.length) return <div style={{ opacity: 0.7 }}>There are no comments at the moment.</div>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {comments.map((c) => (
        <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 0, background: '#2a2a36' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{c.author || 'user'}</div>
            <div>{c.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}


