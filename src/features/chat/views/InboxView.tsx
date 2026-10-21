import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Lock, MessageCircle, MessageSquarePlus, Search, Settings, UserRoundPen,
} from 'lucide-react';

import Spinner from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/hooks';
import { useModal } from '@/hooks/useModal';
import { NostrLinkGate } from '@/features/nostr-link';

import { formatThresholdDigits } from '../utils/formatters';
import { RoomStatusChip } from '../components/RoomStatusChip';
import { ContactRow } from '../components/ContactRow';
import { StartNewChatDialog } from '../components/StartNewChatDialog';
import { EditProfileDialog } from '../components/EditProfileDialog';
import { useChatList, type ChatTab } from '../hooks/useChatList';
import { useRoomSession } from '../hooks/useRoomSession';
import { isChatRelayConfigured } from '../core/relay-config';
import ChatUnavailableNotice from '../components/ChatUnavailableNotice';
import { WebChatSafetyNotice } from '../components/WebChatSafetyNotice';

const TABS: { key: ChatTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'dms', label: 'DMs' },
  { key: 'communities', label: 'Communities' },
];

/** The same inbox occupies the full mobile screen and the desktop left pane. */
const InboxView = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { activeAccount } = useAccount();
  const { openModal } = useModal();
  const session = useRoomSession();
  const [activeTab, setActiveTab] = useState<ChatTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { rows, counts, roomsLoading } = useChatList({ activeTab, searchQuery });

  if (!isChatRelayConfigured()) return embedded ? null : <ChatUnavailableNotice />;

  const inbox = (
    <section className="chat-inbox-pane flex h-full min-h-0 w-full flex-col border-border lg:w-[360px] lg:shrink-0 lg:border-r" aria-label="Chat inbox">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h1 className="ui-page-title m-0 text-xl">Messages</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild aria-label="Relay settings" title="Relay settings">
            <Link to="/chat/settings/relays"><Settings className="h-5 w-5" /></Link>
          </Button>
          {session.isUnlocked && (
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} aria-label="Edit chat profile" title="Edit chat profile">
              <UserRoundPen className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setStartOpen(true)} disabled={!activeAccount} aria-label="New chat" title="New chat">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <WebChatSafetyNotice />
      {activeAccount && (
        <>
          <label className="relative mx-4 mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <span className="sr-only">Search conversations</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations"
              className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
          </label>
          <div className="mt-3 flex border-b border-border px-2" role="tablist" aria-label="Conversation type">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-11 flex-1 border-b-2 px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:bg-card hover:text-foreground'}`}
              >
                {tab.label} <span className="text-xs font-normal">{counts[tab.key]}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel">
        {!activeAccount && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <MessageCircle className="h-10 w-10 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">Your conversations start here</h2>
            <p className="text-sm text-muted-foreground">Connect your wallet to see messages and communities.</p>
            <Button onClick={() => openModal({ name: 'connect-wallet' })}>Connect wallet</Button>
          </div>
        )}
        {activeAccount && !session.isUnlocked && (
          <div className="m-4 rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm text-foreground">Unlock chat to read your direct messages.</p>
            {session.error && <p role="alert" className="mb-3 text-xs text-error">{session.error.message}</p>}
            <Button size="sm" onClick={() => { session.unlock(); }} disabled={session.isUnlocking}>
              {session.isUnlocking ? 'Unlocking…' : 'Unlock chat'}
            </Button>
          </div>
        )}
        {activeAccount && activeTab !== 'dms' && roomsLoading && (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Spinner className="h-4 w-4" />Checking access…</div>
        )}
        {activeAccount && rows.length === 0 && !roomsLoading && (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No matching conversations.' : activeTab === 'communities'
              ? 'No communities yet. Hold a community token to join a room.'
              : 'No conversations yet. Start a new chat.'}
          </div>
        )}
        <ul className="divide-y divide-border">
          {activeAccount && rows.map((row) => {
            if (row.kind === 'room') {
              const { room } = row;
              const threshold = formatThresholdDigits(room.min_token_threshold);
              const path = `/chat/${room.sale_address}`;
              return (
                <li key={`room_${room.sale_address}`}>
                  <Link to={path} aria-current={pathname === path ? 'page' : undefined} className={`flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-primary ${pathname === path ? 'bg-card' : ''}`}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">#{room.symbol.slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 truncate font-semibold text-foreground">#{room.symbol}{room.is_private && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Private room" />}</span>
                      {threshold && <span className="block truncate text-xs text-muted-foreground">Hold ≥ {threshold} #{room.symbol}</span>}
                    </span>
                    <RoomStatusChip room={room} />
                  </Link>
                </li>
              );
            }
            const { conversation } = row;
            const path = `/chat/dm/${conversation.peerId}`;
            return (
              <li key={`dm_${conversation.peerId}`}>
                <ContactRow
                  seed={conversation.address}
                  title={conversation.displayName}
                  subtitle={conversation.lastMessage || conversation.bio}
                  unreadCount={conversation.unreadCount}
                  onClick={() => navigate(path)}
                  className={`min-h-16 rounded-none border-0 bg-transparent px-4 py-3 hover:bg-card ${pathname === path ? 'bg-card' : ''}`}
                />
              </li>
            );
          })}
        </ul>
      </div>
      <StartNewChatDialog open={startOpen} onOpenChange={setStartOpen} />
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      <NostrLinkGate />
    </section>
  );

  if (embedded) return inbox;
  return (
    <div className="chat-workspace ui-page chat-page mx-auto flex h-[calc(100dvh-8rem)] min-h-[28rem] w-full max-w-6xl overflow-hidden border-x border-border lg:h-[100dvh]">
      {inbox}
      <section className="hidden min-w-0 flex-1 flex-col items-center justify-center px-8 text-center lg:flex" aria-label="Conversation">
        <MessageCircle className="mb-4 h-12 w-12 text-primary" aria-hidden />
        <h2 className="text-2xl font-bold text-foreground">Select a message</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Choose a conversation from the list or start a new one.</p>
        {activeAccount && <Button className="mt-5" onClick={() => setStartOpen(true)}>New message</Button>}
      </section>
    </div>
  );
};

export default InboxView;
