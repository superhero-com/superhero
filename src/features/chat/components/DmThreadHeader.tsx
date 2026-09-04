/**
 * DM thread header — avatar + display name + shortened npub, with a back link.
 * Web analogue of the app's `chat-header.tsx`.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import Identicon from '@/components/Identicon';
import { formatContactName, shortenNpub } from '../utils/formatters';
import { hexToNpub } from '../utils/converters';
import type { Contact, Profile } from '../core/types';

export interface DmThreadHeaderProps {
  pubkey: string;
  contact?: Contact;
  profile?: Profile;
}

export const DmThreadHeader = ({ pubkey, contact, profile }: DmThreadHeaderProps) => {
  const npub = contact?.npub || hexToNpub(pubkey);
  const displayName = contact ? formatContactName(contact, profile) : shortenNpub(npub);
  return (
    <header className="flex items-center gap-2 border-b border-border px-3 py-3">
      <Link
        to="/chat"
        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label="Back to chat"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <Identicon address={npub} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-foreground">{displayName}</div>
        <div className="truncate text-xs text-muted-foreground">{shortenNpub(npub)}</div>
      </div>
    </header>
  );
};
