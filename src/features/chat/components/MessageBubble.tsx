import { cn } from '@/lib/utils';
import { formatMessageTime, shortenPubkey } from '../utils/formatters';
import type { GatedMessage } from '../hooks/useGatedRoom';

/** Human text for an in-thread NIP-29 membership system line. */
function systemLineText(message: GatedMessage): string {
  const { system } = message;
  if (!system) return '';
  const who = (pk: string) => (pk ? shortenPubkey(pk) : 'someone');
  const targets = system.targetPubkeys.map(who).join(', ');
  switch (system.action) {
    case 'add':
      return system.actorIsSystem
        ? `${targets} joined`
        : `${who(system.actorPubkey)} added ${targets}`;
    case 'remove':
      return `${who(system.actorPubkey)} removed ${targets}`;
    case 'leave':
    default:
      return `${who(system.actorPubkey)} left`;
  }
}

export const MessageBubble = ({ message }: { message: GatedMessage }) => {
  if (message.system) {
    return (
      <div className="my-1 text-center text-xs text-muted-foreground">
        {systemLineText(message)}
      </div>
    );
  }

  const isMe = message.isFromMe;
  return (
    <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
      {!isMe && (
        <span className="mb-0.5 px-1 text-xs text-muted-foreground">
          {shortenPubkey(message.authorPubkey)}
        </span>
      )}
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
        {formatMessageTime(message.timestamp)}
        {message.status === 'sending' && ' · sending…'}
        {message.status === 'failed' && ' · failed'}
      </span>
    </div>
  );
};
