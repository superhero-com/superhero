import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Lock, MessageSquarePlus, Search, Settings, ShieldCheck, UserRoundPen, X,
} from 'lucide-react';
import Spinner from '@/components/Spinner';
import Identicon from '@/components/Identicon';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/hooks';
import { formatMessageTime, formatThresholdDigits } from '../utils/formatters';
import { RoomStatusChip } from './RoomStatusChip';
import { EditProfileDialog } from './EditProfileDialog';
import { WebChatSafetyNotice } from './WebChatSafetyNotice';
import { useChatList, type ChatTab } from '../hooks/useChatList';
import { useRoomSession } from '../hooks/useRoomSession';

const TABS: { key: ChatTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'dms', label: 'Direct' },
  { key: 'communities', label: 'Communities' },
];

export const ChatSidebar = ({ isInbox, onStartChat }: {
  isInbox: boolean; onStartChat: () => void;
}) => {
  const { activeAccount } = useAccount();
  const session = useRoomSession();
  const [activeTab, setActiveTab] = useState<ChatTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const { rows, counts, roomsLoading } = useChatList({ activeTab, searchQuery });

  let emptyDescription = 'Start a new chat. Your conversations will appear here.';
  if (activeTab === 'communities') emptyDescription = 'Hold a community token to unlock its room.';
  if (searchQuery) emptyDescription = 'Try a different name, message or community.';

  return (
    <aside className="chat-sidebar" aria-label="Chat list">
      <header className="chat-sidebar-heading">
        <div>
          <h1>
            Chat
            <span className="chat-heading-dot" />
          </h1>
          <p>Your people. Your communities.</p>
        </div>
        <Button size="icon" onClick={onStartChat} disabled={!activeAccount} aria-label="New chat" title="New chat" className="chat-new-button">
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </header>

      <div className="chat-sidebar-controls">
        <div className="chat-search">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <input
            type="search"
            aria-label="Search chats"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear chat search"><X className="h-4 w-4" /></button>
          )}
        </div>
        <div className="chat-filters" role="group" aria-label="Filter conversations">
          {TABS.map((tab) => (
            <button key={tab.key} type="button" aria-pressed={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
              <span>{counts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-sidebar-scroll">
        {!activeAccount && <p className="chat-list-notice">Connect an account to use chat.</p>}
        {activeAccount && !session.isUnlocked && isInbox && (
          <div className="chat-unlock-card">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            <p>Unlock chat to load your direct messages.</p>
            {session.error && <p className="text-error">{session.error.message}</p>}
            <Button size="sm" onClick={() => { session.unlock(); }} disabled={session.isUnlocking || !session.canUnlock}>
              {session.isUnlocking ? 'Unlocking…' : 'Unlock chat'}
            </Button>
          </div>
        )}
        {activeAccount && activeTab !== 'dms' && roomsLoading && (
          <div className="chat-list-notice flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            Checking access…
          </div>
        )}
        {activeAccount && rows.length === 0 && !roomsLoading && (
          <div className="chat-list-notice">
            <p className="mb-1 font-medium text-foreground">{searchQuery ? 'No matches found' : 'A fresh start'}</p>
            <p>{emptyDescription}</p>
          </div>
        )}
        <ul className="chat-list">
          {activeAccount && rows.map((row) => {
            if (row.kind === 'room') {
              const { room } = row;
              const threshold = formatThresholdDigits(room.min_token_threshold);
              return (
                <li key={`room_${room.sale_address}`}>
                  <NavLink to={`/chat/${room.sale_address}`} className="chat-list-row">
                    <div className="chat-room-avatar" aria-hidden>#</div>
                    <div className="chat-row-content">
                      <div className="chat-row-title">
                        <span>{`#${room.symbol}`}</span>
                        {room.is_private && <Lock className="h-3 w-3 shrink-0" aria-hidden />}
                      </div>
                      <p>{threshold ? `Hold ≥ ${threshold} #${room.symbol}` : 'Community room'}</p>
                      <RoomStatusChip room={room} />
                    </div>
                  </NavLink>
                </li>
              );
            }
            const { conversation } = row;
            return (
              <li key={`dm_${conversation.peerId}`}>
                <NavLink to={`/chat/dm/${conversation.peerId}`} className="chat-list-row">
                  <Identicon address={conversation.address} size={44} />
                  <div className="chat-row-content">
                    <div className="chat-row-title"><span>{conversation.displayName}</span></div>
                    <p>{conversation.lastMessage || conversation.bio || 'Start a conversation'}</p>
                  </div>
                  <div className="chat-row-meta">
                    {conversation.lastMessageTimestamp && (
                      <time dateTime={new Date(conversation.lastMessageTimestamp).toISOString()}>
                        {formatMessageTime(conversation.lastMessageTimestamp)}
                      </time>
                    )}
                    {conversation.unreadCount > 0 && <span className="chat-unread" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>}
                  </div>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="chat-sidebar-footer">
        <div className="chat-sidebar-tools">
          <span className="chat-session-label">
            {session.isUnlocked ? <ShieldCheck size={15} /> : <Lock size={15} />}
            {session.isUnlocked ? 'Chat unlocked' : 'Chat locked'}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} disabled={!session.isUnlocked} aria-label="Edit chat profile" title="Edit chat profile"><UserRoundPen size={17} /></Button>
          <Button variant="ghost" size="icon" asChild aria-label="Relay settings" title="Relay settings"><Link to="/chat/settings/relays"><Settings size={17} /></Link></Button>
        </div>
        <details className="chat-safety">
          <summary>About web chat</summary>
          <WebChatSafetyNotice dismissible={false} />
        </details>
      </footer>
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </aside>
  );
};
