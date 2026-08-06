/**
 * Communities — the token-gated rooms the active account is eligible for
 * (ported from the app's `app/(tabs)/chat.tsx`). Source of truth is the API
 * (`useGatedRooms`); each row shows a Member / Pending / Locked chip derived
 * from `relay_state` + `readable`. Access is resolved default-DENY.
 */
import { Link } from 'react-router-dom';
import { MessagesSquare, Lock } from 'lucide-react';

import Spinner from '@/components/Spinner';
import { useAccount } from '@/hooks';
import { formatThresholdDigits } from '../utils/formatters';
import { useGatedRooms } from '../hooks/useGatedRooms';
import { RoomStatusChip } from '../components/RoomStatusChip';

const CommunitiesView = () => {
  const { activeAccount } = useAccount();
  const { rooms, isLoading } = useGatedRooms();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-center gap-2">
        <MessagesSquare className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">Communities</h1>
      </header>

      {!activeAccount && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Connect an account to see the token-gated rooms you can join.
        </p>
      )}

      {activeAccount && isLoading && (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Checking access…
        </div>
      )}

      {activeAccount && !isLoading && rooms.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <Lock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No communities yet. Hold a community token to unlock its room.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {rooms.map((room) => {
          const threshold = formatThresholdDigits(room.min_token_threshold);
          return (
            <li key={room.sale_address}>
              <Link
                to={`/chat/${room.sale_address}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  #
                  {room.symbol.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">
                      #
                      {room.symbol}
                    </span>
                    {room.is_private && (
                      <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  {threshold && (
                    <span className="block truncate text-xs text-muted-foreground">
                      Hold ≥
                      {' '}
                      {threshold}
                      {' '}
                      #
                      {room.symbol}
                    </span>
                  )}
                </div>
                <RoomStatusChip room={room} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CommunitiesView;
