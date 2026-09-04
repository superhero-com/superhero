/**
 * Start-a-chat dialog (ported from the app's `start-new-chat-sheet.tsx`). Accepts
 * an `ak_…` wallet address (resolved to its linked nostr key via
 * `fetchNostrLink`), an `npub1…`, or a 64-char hex pubkey, then navigates to the
 * DM thread. Below the input, "Suggested" lists accounts that have linked a
 * nostr key, filtered by whatever else is typed (`useNostrLinkedAccounts`, which
 * searches names server-side).
 *
 * A name typed out in full and pressing Start therefore has to mean the same as
 * clicking that row: the button is the obvious thing to press after typing, and
 * making it refuse a name the list is already showing reads as the search being
 * broken.
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
import { useNostrLinkedAccounts, type NostrLinkedAccount } from '../hooks/useNostrLinkedAccounts';
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
  const { accounts, query } = useNostrLinkedAccounts(
    looksLikeTarget ? '' : search,
    { enabled: open, limit: 12 },
  );
  // No results for this term YET. Submitting now would report "no account" for a
  // name whose row is about to appear. Deliberately not `isFetching`: that also
  // covers the background refetch on window focus, which would disable Start
  // while the matching row is on screen.
  const isSearching = !looksLikeTarget && query.isLoading;

  const suggestions = useMemo(
    () => accounts.filter((a) => a.nostrAddress),
    [accounts],
  );

  // Whole name only. A prefix that happens to match one row today matches a
  // different person once someone else registers a longer name.
  const namedExactly = useMemo(() => {
    const needle = search.toLowerCase();
    return needle
      ? suggestions.filter((a) => a.chainName?.toLowerCase() === needle)
      : [];
  }, [suggestions, search]);

  const openDm = (pubkey: string, seed: string, label: string) => {
    record({
      kind: 'dm', id: pubkey, seed, label,
    });
    onOpenChange(false);
    setValue('');
    navigate(`/chat/dm/${pubkey}`);
  };

  /** The one path a chosen account opens through, whether picked or typed. */
  const openAccount = (account: NostrLinkedAccount) => {
    try {
      const { pubkey } = normalizeNostrId(account.nostrAddress!);
      openDm(pubkey, account.address, account.chainName || formatAddress(account.address));
    } catch {
      setError('Could not resolve that account’s Nostr key.');
    }
  };

  const resolveAndOpen = async () => {
    if (!search) return;
    setError(null);

    if (!looksLikeTarget) {
      if (namedExactly.length === 1) {
        openAccount(namedExactly[0]);
        return;
      }
      if (namedExactly.length > 1) {
        setError('More than one account uses that name — pick the one you meant below.');
        return;
      }
    }

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
      setError('No account found. Enter a full name from the list, a wallet address '
        + '(ak_…), an npub, or a hex pubkey.');
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
            Search by name, or enter a wallet address, npub, or hex pubkey.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); resolveAndOpen(); }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Name, ak_… or npub1…"
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Chat target"
          />
          <Button
            type="submit"
            size="sm"
            // Keeps a name while the label is a spinner.
            aria-label="Start"
            disabled={!search || isResolving || isSearching}
          >
            {isResolving || isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start'}
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
                  onClick={() => openAccount(account)}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
