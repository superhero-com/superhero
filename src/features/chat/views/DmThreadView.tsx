/**
 * A single DM thread (ported from the app's
 * `app/(shared)/chat/[address]/index.tsx`). The `:address` param is the peer's
 * hex pubkey. Messages come from `useMessages(getDMConversationId(pubkey))`; the
 * composer is gated on the room session being unlocked (option-A custody), so a
 * locked session shows an "Unlock chat" prompt instead of an input — and DM
 * decrypt/sign stops the moment the session locks.
 */
import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import { Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Spinner from '@/components/Spinner';
import Identicon from '@/components/Identicon';

import { contactsAtom } from '../domains/contacts/contacts.state';
import { profilesAtom } from '../domains/profiles/profiles.state';
import { getDMConversationId, hexToNpub } from '../utils/converters';
import { formatContactName, shortenNpub } from '../utils/formatters';
import { useChat } from '../hooks/useChat';
import { useMessages } from '../hooks/useMessages';
import { useRoomSession } from '../hooks/useRoomSession';
import { DmThreadHeader } from '../components/DmThreadHeader';
import { DmMessageBubble } from '../components/DmMessageBubble';

const DmThreadView = () => {
  const { address = '' } = useParams();
  const pubkey = address;

  const { isConnected, profileService } = useChat();
  const [contacts] = useAtom(contactsAtom);
  const [profiles] = useAtom(profilesAtom);
  const setProfiles = useSetAtom(profilesAtom);
  const session = useRoomSession();

  const contact = contacts[pubkey];
  const profile = profiles[pubkey];
  const npub = contact?.npub || hexToNpub(pubkey);
  const displayName = contact ? formatContactName(contact, profile) : shortenNpub(npub);

  const conversationId = useMemo(() => getDMConversationId(pubkey), [pubkey]);
  const { messages, sendMessage, markAsRead } = useMessages(conversationId);

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch the peer's profile on open if it isn't cached.
  useEffect(() => {
    if (!profile && profileService && pubkey) {
      profileService.fetchProfile(pubkey)
        .then((fetched) => {
          if (fetched) setProfiles((prev) => ({ ...prev, [pubkey]: fetched }));
        })
        .catch(() => {});
    }
  }, [pubkey, profile, profileService, setProfiles]);

  // Stick to the newest message.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Mark the latest incoming message read while viewing.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && !last.isFromMe) markAsRead(last.id).catch(() => {});
  }, [messages, markAsRead]);

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

  const renderComposer = () => {
    if (!session.isUnlocked) {
      return (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm text-foreground">Unlock chat to read and send messages.</p>
          {session.error && <p className="text-xs text-error">{session.error.message}</p>}
          <Button size="sm" onClick={() => { session.unlock(); }} disabled={session.isUnlocking}>
            {session.isUnlocking ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Unlocking…
              </>
            ) : 'Unlock chat'}
          </Button>
        </div>
      );
    }
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
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
      <DmThreadHeader pubkey={pubkey} contact={contact} profile={profile} />

      {!isConnected && session.isUnlocked && (
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
          Connecting to the chat network…
        </div>
      )}

      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
        {session.isUnlocked && messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <Identicon address={npub} size={72} />
            <p className="text-lg font-semibold text-foreground">{displayName}</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Start a conversation. Your messages are end-to-end encrypted (NIP-04).
            </p>
          </div>
        )}
        {!session.isUnlocked && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Chat is locked.
          </div>
        )}
        {messages.map((message) => (
          <DmMessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="border-t border-border p-3">
        {renderComposer()}
        {sendError && <p className="mt-2 text-xs text-error">{sendError}</p>}
      </div>
    </div>
  );
};

export default DmThreadView;
