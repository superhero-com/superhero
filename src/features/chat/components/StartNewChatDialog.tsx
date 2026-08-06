/**
 * Start-a-chat dialog (ported from the app's `start-new-chat-sheet.tsx`). Accepts
 * an `ak_…` wallet address (resolved to its linked nostr key via
 * `fetchNostrLink`), an `npub1…`, or a 64-char hex pubkey, then navigates to the
 * DM thread. Below the input, "Suggested" lists accounts that have linked a
 * nostr key (`useNostrLinkedAccounts`).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquarePlus } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchNostrLink } from '@/features/nostr-link';
import { formatAddress } from '@/utils/address';

import { normalizeNostrId } from '../utils/converters';
import { ContactRow } from './ContactRow';
import { useNostrLinkedAccounts } from '../hooks/useNostrLinkedAccounts';
import { useRecentChats } from '../hooks/useRecentChats';

export interface StartNewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StartNewChatDialog = ({ open, onOpenChange }: StartNewChatDialogProps) => {
  const navigate = useNavigate();
  const { record } = useRecentChats();
  const [value, setValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = value.trim();
  const looksLikeTarget = /^(ak_|npub1)/.test(search) || /^[0-9a-f]{64}$/i.test(search);
  const { accounts } = useNostrLinkedAccounts(
    looksLikeTarget ? '' : search,
    { enabled: open, limit: 12 },
  );

  const suggestions = useMemo(
    () => accounts.filter((a) => a.nostrAddress),
    [accounts],
  );

  const openDm = (pubkey: string, seed: string, label: string) => {
    record({
      kind: 'dm', id: pubkey, seed, label,
    });
    onOpenChange(false);
    setValue('');
    navigate(`/chat/dm/${pubkey}`);
  };

  const resolveAndOpen = async () => {
    if (!search) return;
    setError(null);
    setIsResolving(true);
    try {
      let pubkey: string;
      if (search.startsWith('ak_')) {
        const linked = await fetchNostrLink(search);
        if (!linked) {
          setError('That account has not linked a Nostr identity yet.');
          return;
        }
        pubkey = normalizeNostrId(linked).pubkey;
      } else {
        pubkey = normalizeNostrId(search).pubkey;
      }
      openDm(pubkey, search, formatAddress(search));
    } catch {
      setError('Enter a valid wallet address (ak_…), npub, or hex pubkey.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" aria-hidden />
            New chat
          </DialogTitle>
          <DialogDescription>
            Enter a wallet address, npub, or hex pubkey to start a conversation.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); resolveAndOpen(); }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ak_… or npub1…"
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Chat target"
          />
          <Button type="submit" size="sm" disabled={!search || isResolving}>
            {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start'}
          </Button>
        </form>
        {error && <p className="text-xs text-error">{error}</p>}

        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="px-1 text-xs font-medium text-muted-foreground">Suggested</p>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {suggestions.map((account) => (
                <ContactRow
                  key={account.address}
                  seed={account.nostrAddress || account.address}
                  title={account.chainName || formatAddress(account.address)}
                  subtitle={formatAddress(account.address)}
                  onClick={() => {
                    try {
                      const { pubkey } = normalizeNostrId(account.nostrAddress!);
                      const label = account.chainName || formatAddress(account.address);
                      openDm(pubkey, account.address, label);
                    } catch {
                      setError('Could not resolve that account’s Nostr key.');
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
