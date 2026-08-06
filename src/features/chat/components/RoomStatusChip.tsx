import { Check, Clock, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { GatedRoomSummary } from '../hooks/useGatedRooms';

export type RoomStatus = 'member' | 'pending' | 'locked';

/**
 * Derive the Communities-list chip from `relay_state` + `readable`, default-DENY:
 *   - `member`  — `readable` (relay_state==='added' AND member_pubkey != null)
 *   - `pending` — provisioning, or eligible-but-not-linked (member_pubkey null)
 *   - `locked`  — otherwise (e.g. a private room the caller can't yet read)
 */
export function roomStatus(room: GatedRoomSummary): RoomStatus {
  if (room.readable) return 'member';
  if (room.relay_state === 'pending_add' || room.member_pubkey === null) {
    return 'pending';
  }
  return 'locked';
}

const CONFIG: Record<
  RoomStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  member: {
    label: 'Member',
    icon: Check,
    className: 'bg-primary/15 text-primary',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-neon-yellow/15 text-neon-yellow',
  },
  locked: {
    label: 'Locked',
    icon: Lock,
    className: 'bg-muted text-muted-foreground',
  },
};

export const RoomStatusChip = ({ room }: { room: GatedRoomSummary }) => {
  const status = roomStatus(room);
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
};
