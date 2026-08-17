/**
 * One direct-message bubble. Web analogue of the mobile DM thread's GiftedChat
 * `renderBubble` — left/right aligned, with a compact time + delivery status.
 */
import { cn } from '@/lib/utils';
import { formatMessageTime } from '../utils/formatters';
import type { DirectMessage } from '../core/types';

export const DmMessageBubble = ({ message }: { message: DirectMessage }) => {
  const isMe = message.isFromMe;
  return (
    <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
          isMe
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {message.content}
      </div>
      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
        {formatMessageTime(message.createdAt || message.timestamp)}
        {message.status.type === 'sending' && ' · sending…'}
        {message.status.type === 'failed' && ' · failed'}
      </span>
    </div>
  );
};
