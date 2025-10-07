import React, { useMemo } from 'react';
import { VoteState } from 'bctsl-sdk';
import { Decimal } from '@/libs/decimal';
import AddressChip from '@/components/AddressChip';

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
      <div className="border border-white/10 rounded-xl p-3 sm:p-4 bg-black/20 backdrop-blur-lg text-white">
        <div className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Voters</div>
        <div className="text-xs sm:text-sm text-white/80">
          No voters found for this proposal.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl bg-black/20 backdrop-blur-lg text-white">
      <div className="p-3 sm:p-4 border-b border-white/10">
        <div className="text-base sm:text-lg font-bold">Voters</div>
      </div>

      {/* Mobile Card Layout */}
      <div className="block sm:hidden">
        <div className="divide-y divide-white/5">
          {items.map((item, index) => (
            <div key={index} className="p-3 hover:bg-white/5 transition-colors duration-200">
              <div className="space-y-2">
                {/* Voter Address */}
                <div>
                  <div className="text-xs text-white/60 mb-1">Voter</div>
                  <AddressChip address={item.address} linkToExplorer />
                </div>
                
                {/* Choice and Voting Power Row */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-white/60 mb-1">Choice</div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${item.choice
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
                  </div>
                  
                  <div className="flex-1 text-right">
                    <div className="text-xs text-white/60 mb-1">Voting Power</div>
                    <div className="text-sm font-medium">
                      {Decimal.fromBigNumberString(item.amount.toString()).prettify()}
                    </div>
                    <div className="text-xs text-white/60">
                      {token.symbol || token.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-white/80">Voter</th>
              <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-white/80">Choice</th>
              <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-medium text-white/80">Voting Power</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200">
                <td className="p-3 lg:p-4">
                  <AddressChip address={item.address} linkToExplorer />
                </td>
                <td className="p-3 lg:p-4">
                  <span className={`inline-flex items-center gap-2 px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium ${item.choice
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
                <td className="p-3 lg:p-4">
                  <div className="text-sm lg:text-base">
                    {Decimal.fromBigNumberString(item.amount.toString()).prettify()}
                  </div>
                  <div className="text-xs text-white/60">
                    {token.symbol || token.name}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
