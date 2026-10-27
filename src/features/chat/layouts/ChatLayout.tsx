import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NostrLinkGate } from '@/features/nostr-link';
import { useAccount } from '@/hooks';
import Spinner from '@/components/Spinner';
import { ChatSidebar } from '../components/ChatSidebar';
import { StartNewChatDialog } from '../components/StartNewChatDialog';
import { isChatRelayConfigured } from '../core/relay-config';
import ChatUnavailableNotice from '../components/ChatUnavailableNotice';
import '../chat-layout.scss';

export interface ChatLayoutContext { startChat: () => void }

const ChatLayout = () => {
  const { pathname } = useLocation();
  const { activeAccount } = useAccount();
  const [startOpen, setStartOpen] = useState(false);
  const isInbox = /^\/chat\/?$/.test(pathname);

  if (!isChatRelayConfigured()) return <ChatUnavailableNotice />;

  return (
    <div className={`chat-shell ${isInbox ? 'chat-shell--inbox' : 'chat-shell--detail'}`}>
      <ChatSidebar key={activeAccount} isInbox={isInbox} onStartChat={() => setStartOpen(true)} />
      <main className="chat-detail" aria-label="Messenger">
        <Suspense fallback={<div className="chat-pane-loading"><Spinner /></div>}>
          {/* A new recipient gets its own draft and send state; the sidebar stays mounted. */}
          <Outlet
            key={pathname}
            context={{ startChat: () => setStartOpen(true) } satisfies ChatLayoutContext}
          />
        </Suspense>
      </main>
      <StartNewChatDialog open={startOpen} onOpenChange={setStartOpen} />
      <NostrLinkGate />
    </div>
  );
};

export default ChatLayout;
