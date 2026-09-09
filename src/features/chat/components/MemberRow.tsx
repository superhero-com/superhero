import AddressAvatar from '@/components/AddressAvatar';
import { cn } from '@/lib/utils';
import { shortenPubkey } from '../utils/formatters';
import type { GroupMember } from '../hooks/useGroupInfo';

/** Shorten an æ address for display (addresses are always shortened). */
function shortenAddress(address: string): string {
  if (address.length < 13) return address;
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

/** Subtitle precedence: roster æ address > shortened pubkey. */
function memberSubtitle(member: GroupMember): string {
  if (member.address) return shortenAddress(member.address);
  if (member.pubkey) return shortenPubkey(member.pubkey);
  return '';
}

export const MemberRow = ({ member }: { member: GroupMember }) => {
  const subtitle = memberSubtitle(member);

  return (
    <div className="flex items-center gap-3 py-2">
      {member.address ? (
        <AddressAvatar address={member.address} size={36} />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
          {member.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {member.name}
          </span>
          {member.isMe && (
            <span className="text-xs text-muted-foreground">(you)</span>
          )}
          {member.isAdmin && (
            <span
              className={cn(
                'rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary',
              )}
            >
              admin
            </span>
          )}
        </div>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
