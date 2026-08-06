/**
 * Entry point from a token page into its token-gated Communities room (the Nostr
 * stack ported in ZIX-562). This sits *beside* the read-only Matrix/quali.chat
 * feed (`Trendminer/TokenChat.tsx`) — a deliberate CTO decision to add, not
 * replace: the two are independent chat surfaces on the same token.
 *
 * The room is keyed by the token's sale address, matching the
 * `/chat/:saleAddress` route; access is resolved default-DENY inside the room.
 */
import { Link } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';

type Props = {
  saleAddress: string;
  symbol?: string;
};

const TokenCommunityChatButton = ({ saleAddress, symbol }: Props) => {
  if (!saleAddress) return null;

  return (
    <Link
      to={`/chat/${saleAddress}`}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 no-underline backdrop-blur-[14px] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/30"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/12">
        <MessagesSquare className="h-5 w-5 text-white" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-[15px] font-semibold tracking-wide text-white">Community chat</div>
        <div className="truncate text-xs leading-relaxed text-white/70">
          {symbol
            ? `Token-gated room for #${symbol} holders`
            : 'Token-gated room for holders'}
        </div>
      </div>
    </Link>
  );
};

export default TokenCommunityChatButton;
