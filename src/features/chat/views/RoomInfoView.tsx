/**
 * Room info (ported from the app's `.../group/[groupId]/info.tsx`). The roster is
 * fetched with `include_pending` and split into **Members** (`relay_state ===
 * 'added'`) and **Invited** (`eligible && relay_state !== 'added'`);
 * `removed`/`pending_remove` rows are hidden. Row keys are `pubkey ?? address`
 * because invited pubkeys are null.
 */
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

import Spinner from '@/components/Spinner';
import { useGroupInfo } from '../hooks/useGroupInfo';
import { useGatedRoomSummary } from '../hooks/useGatedRooms';
import { MemberRow } from '../components/MemberRow';
import type { GroupMember } from '../hooks/useGroupInfo';

const Section = ({
  title,
  members,
}: {
  title: string;
  members: GroupMember[];
}) => {
  if (members.length === 0) return null;
  return (
    <section className="mb-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        {' '}
        ·
        {members.length}
      </h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-card px-3">
        {members.map((member) => (
          <MemberRow key={member.pubkey ?? member.address} member={member} />
        ))}
      </div>
    </section>
  );
};

const RoomInfoView = () => {
  const { saleAddress = '' } = useParams();
  const { room } = useGatedRoomSummary(saleAddress);
  const {
    name, about, isPrivate, members, invited, adminCount, isLoading,
  } = useGroupInfo(saleAddress);

  const heading = room ? `#${room.symbol}` : name;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-center gap-2">
        <Link
          to={`/chat/${saleAddress}`}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Back to room"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 truncate text-xl font-semibold text-foreground">
          {heading}
        </h1>
        {(isPrivate || room?.is_private) && (
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </header>

      {about && <p className="mb-4 text-sm text-muted-foreground">{about}</p>}

      <p className="mb-4 text-xs text-muted-foreground">
        {members.length}
        {' '}
        member
        {members.length === 1 ? '' : 's'}
        {adminCount > 0 && ` · ${adminCount} admin${adminCount === 1 ? '' : 's'}`}
        {invited.length > 0 && ` · ${invited.length} invited`}
      </p>

      {isLoading && members.length === 0 && (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Loading roster…
        </div>
      )}

      <Section title="Members" members={members} />
      <Section title="Invited" members={invited} />
    </div>
  );
};

export default RoomInfoView;
