import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowUpRight, MessageCircle, MessageSquarePlus, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/hooks';
import type { ChatLayoutContext } from '../layouts/ChatLayout';

const InboxView = () => {
  const { startChat } = useOutletContext<ChatLayoutContext>();
  const { activeAccount } = useAccount();
  return (
    <div className="chat-welcome">
      <div className="chat-welcome-content">
        <div className="chat-welcome-icon"><MessageCircle size={36} strokeWidth={1.5} /></div>
        <span className="chat-eyebrow">A place to connect</span>
        <h2>
          Your conversations,
          <br />
          all together.
        </h2>
        <p>
          Catch up with your people or join the conversation in your communities.
          Choose a chat to get started.
        </p>
        <Button onClick={startChat} disabled={!activeAccount} className="chat-welcome-action">
          <MessageSquarePlus size={17} />
          Start a conversation
        </Button>
        <Link to="/trends/tokens" className="chat-discover">
          Explore communities
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <p className="chat-welcome-note">
        <ShieldCheck size={15} />
        Direct messages are end-to-end encrypted.
      </p>
    </div>
  );
};

export default InboxView;
