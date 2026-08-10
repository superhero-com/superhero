/**
 * Chat inbox (ported from the app's `(tabs)/chat.tsx`). Three tabs — All /
 * Communities / DMs — over the unified `useChatList` rows. Communities rows link
 * to the token-gated room (stage 3); DM rows link to the DM thread (stage 4).
 * A locked session shows an unlock prompt; the DM plane needs the session key.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock, MessageSquarePlus, Settings, UserRoundPen,
} from 'lucide-react';

import Spinner from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAccount } from '@/hooks';

import { formatThresholdDigits } from '../utils/formatters';
import { RoomStatusChip } from '../components/RoomStatusChip';
import { ContactRow } from '../components/ContactRow';
import { StartNewChatDialog } from '../components/StartNewChatDialog';
import { EditProfileDialog } from '../components/EditProfileDialog';
import { useChatList, type ChatTab } from '../hooks/useChatList';
import { useRoomSession } from '../hooks/useRoomSession';

const TABS: { key: ChatTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'communities', label: 'Communities' },
  { key: 'dms', label: 'DMs' },
];

const InboxView = () => {
  const navigate = useNavigate();
  const { activeAccount } = useAccount();
  const session = useRoomSession();
  const [activeTab, setActiveTab] = useState<ChatTab>('all');
  const [startOpen, setStartOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const {
    rows, counts, roomsLoading,
  } = useChatList({ activeTab, searchQuery: '' });

  const tabCount = useMemo(() => ({
    all: counts.all, communities: counts.communities, dms: counts.dms,
  }), [counts]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">Chat</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            aria-label="Relay settings"
          >
            <Link to="/chat/settings/relays">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
            disabled={!session.isUnlocked}
            aria-label="Edit chat profile"
          >
            <UserRoundPen className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setStartOpen(true)} disabled={!activeAccount}>
            <MessageSquarePlus className="mr-1 h-4 w-4" />
            New chat
          </Button>
        </div>
      </header>

      {!activeAccount && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Connect an account to use chat.
        </p>
      )}

      {activeAccount && !session.isUnlocked && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            Unlock chat to load your direct messages.
          </p>
          {session.error && <p className="text-xs text-error">{session.error.message}</p>}
          <div>
            <Button size="sm" onClick={() => { session.unlock(); }} disabled={session.isUnlocking}>
              {session.isUnlocking ? 'Unlocking…' : 'Unlock chat'}
            </Button>
          </div>
        </div>
      )}

      {activeAccount && (
        <>
          <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                <span className="ml-1 text-xs opacity-70">{tabCount[tab.key]}</span>
              </button>
            ))}
          </div>

          {activeTab !== 'dms' && roomsLoading && (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Checking access…
            </div>
          )}

          {rows.length === 0 && !roomsLoading && (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {activeTab === 'communities'
                ? 'No communities yet. Hold a community token to unlock its room.'
                : 'No conversations yet. Start a new chat to get going.'}
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {rows.map((row) => {
              if (row.kind === 'room') {
                const { room } = row;
                const threshold = formatThresholdDigits(room.min_token_threshold);
                return (
                  <li key={`room_${room.sale_address}`}>
                    <Link
                      to={`/chat/${room.sale_address}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        #
                        {room.symbol.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">
                            #
                            {room.symbol}
                          </span>
                          {room.is_private && (
                            <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
                          )}
                        </div>
                        {threshold && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {`Hold ≥ ${threshold} #${room.symbol}`}
                          </span>
                        )}
                      </div>
                      <RoomStatusChip room={room} />
                    </Link>
                  </li>
                );
              }
              const { conversation } = row;
              return (
                <li key={`dm_${conversation.peerId}`}>
                  <ContactRow
                    seed={conversation.address}
                    title={conversation.displayName}
                    subtitle={conversation.lastMessage || conversation.bio}
                    unreadCount={conversation.unreadCount}
                    onClick={() => navigate(`/chat/dm/${conversation.peerId}`)}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <StartNewChatDialog open={startOpen} onOpenChange={setStartOpen} />
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
};

export default InboxView;
