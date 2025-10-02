import React, { useMemo } from 'react';
import { VoteState } from 'bctsl-sdk';
import { Decimal } from '@/libs/decimal';
import AddressChip from '@/components/AddressChip';
import { LivePriceFormatter, PriceFormatter, TokenPriceFormatter } from '@/features/shared/components';

interface VotersTableProps {
  voteState: VoteState;
  token: any;
}

interface VoterItem {
  address: string;
  amount: bigint;
  choice: boolean;
}

export default function VotersTable({ voteState, token }: VotersTableProps) {
  const items = useMemo((): VoterItem[] => {
    const voterItems: VoterItem[] = [];

    if (voteState?.vote_accounts) {
      for (const [address, vote] of voteState.vote_accounts.entries()) {
        voterItems.push({
          address,
          amount: vote[0],
          choice: vote[1],
        });
      }
    }

    return voterItems;
  }, [voteState]);

  if (!items.length) {
    return (
      <div className="border border-white/10 rounded-xl p-4 bg-black/20 backdrop-blur-lg text-white">
        <div className="text-lg font-bold mb-4">Voters</div>
        <div className="text-sm text-white/80">
          No voters found for this proposal.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl bg-black/20 backdrop-blur-lg text-white">
      <div className="p-4 border-b border-white/10">
        <div className="text-lg font-bold">Voters</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-white/80">Voter</th>
              <th className="text-left p-4 text-sm font-medium text-white/80">Choice</th>
              <th className="text-left p-4 text-sm font-medium text-white/80">Voting Power</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200">
                <td className="p-4">
                  <AddressChip address={item.address} linkToExplorer />
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${item.choice
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    <span className="text-xs">
                      {item.choice ? '✓' : '○'}
                    </span>
                    <span>
                      {item.choice ? 'Yes' : 'No'}
                    </span>
                  </span>
                </td>
                <td className="p-4">
                  {Decimal.fromBigNumberString(item.amount.toString()).prettify()} {token.symbol || token.name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
