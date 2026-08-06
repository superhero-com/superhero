/**
 * A single token-gated room (ported from the app's
 * `app/(shared)/chat/group/[groupId]/index.tsx`). The message list is built from
 * the repo's own primitives — GiftedChat has no web equivalent, and no RN shim
 * is added.
 *
 * Access is resolved default-DENY from the eligible-rooms list
 * (`room?.readable ?? false`); while the list is loading the banner shows a
 * neutral "Checking access…" state, never "not eligible". The composer is gated
 * on `useEnablePosting`'s banner (link / provisioning / holder / not-eligible),
 * and — once eligible — on the local room session being unlocked to sign.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Info, Loader2, Send,
} from 'lucide-react';

import Spinner from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NostrLinkGate, useRequestNostrLinkPrompt } from '@/features/nostr-link';
import { useGatedRoomSummary } from '../hooks/useGatedRooms';
import { useGatedRoom } from '../hooks/useGatedRoom';
import { useEnablePosting } from '../hooks/useEnablePosting';
import { useRoomSession } from '../hooks/useRoomSession';
import { MessageBubble } from '../components/MessageBubble';
import { PostingBannerCard } from '../components/PostingBannerCard';

const RoomView = () => {
  const { saleAddress = '' } = useParams();
  // Mount the canonical link dialog so `requestLink()` can open it.
  useRequestNostrLinkPrompt();

  const { room, isLoading: roomsLoading } = useGatedRoomSummary(saleAddress);
  // Default-DENY: unknown until the list resolves.
  const readable = room?.readable ?? false;
  const isPrivate = room?.is_private ?? false;

  const {
    messages,
    sendMessage,
    access,
    canPost,
    needsUnlock,
    isReady,
    loadEarlier,
    hasEarlier,
    isLoadingEarlier,
  } = useGatedRoom(saleAddress, { isPrivate, readable });

  const { banner, requestLink, refresh } = useEnablePosting({
    room,
    access,
    canPost,
    symbolLabel: room?.symbol,
    roomsLoading,
  });

  const session = useRoomSession();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Stick to the bottom as messages arrive.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setSendError(null);
    setDraft('');
    try {
      await sendMessage(text);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Message failed to send.');
    }
  };

  const title = room ? `#${room.symbol}` : 'Community';

  const renderComposer = () => {
    if (banner) {
      return (
        <PostingBannerCard
          banner={banner}
          onLink={requestLink}
          onCheckAgain={refresh}
        />
      );
    }
    if (needsUnlock) {
      return (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            Unlock chat to post in this room.
          </p>
          {session.error && (
            <p className="text-xs text-error">{session.error.message}</p>
          )}
          <Button
            size="sm"
            onClick={() => {
              session.unlock();
            }}
            disabled={session.isUnlocking}
          >
            {session.isUnlocking ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Unlocking…
              </>
            ) : (
              'Unlock chat'
            )}
          </Button>
        </div>
      );
    }
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message #${room?.symbol ?? 'room'}`}
          aria-label="Message"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    );
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-[28rem] w-full max-w-2xl flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-3">
        <Link
          to="/chat"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Back to communities"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 truncate text-lg font-semibold text-foreground">
          {title}
        </h1>
        <Link
          to={`/chat/${saleAddress}/info`}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Room info"
        >
          <Info className="h-5 w-5" />
        </Link>
      </header>

      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4"
      >
        {!isReady && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Connecting…
          </div>
        )}
        {isReady && hasEarlier && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              loadEarlier();
            }}
            disabled={isLoadingEarlier}
            className="mx-auto mb-2 text-xs text-primary disabled:opacity-50"
          >
            {isLoadingEarlier ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}
        {isReady && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet.
          </p>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="border-t border-border p-3">
        {renderComposer()}
        {sendError && <p className="mt-2 text-xs text-error">{sendError}</p>}
      </div>

      {/* Canonical AE↔Nostr link dialog — opened by the `link-required` banner. */}
      <NostrLinkGate />
    </div>
  );
};

export default RoomView;
