import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { VoteState } from 'bctsl-sdk';
import { AddressChip } from '@/components/AddressChip';
import { formatUnits } from '../utils/voteRules';

interface VotersTableProps {
  voteState: Pick<VoteState, 'vote_accounts'>;
  token: { symbol?: string; name?: string };
  decimals?: number;
}

interface VoterItem {
  address: string;
  amount: bigint;
  choice: boolean;
}

/** Who voted, which side and with how many tokens, biggest stake first. */
const VotersTable = ({ voteState, token, decimals = 18 }: VotersTableProps) => {
  const { t, i18n } = useTranslation('dao');
  const items = useMemo((): VoterItem[] => {
    const voterItems: VoterItem[] = [];
    voteState?.vote_accounts?.forEach((vote, address) => {
      voterItems.push({ address, amount: vote[0], choice: vote[1] });
    });
    return voterItems.sort((a, b) => (b.amount > a.amount ? 1 : -1));
  }, [voteState]);

  if (!items.length) {
    return <p className="dao-v-muted text-sm">{t('voters.noVotersFound')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="dao-v-voters">
        <thead>
          <tr>
            <th scope="col">{t('voters.voter')}</th>
            <th scope="col">{t('voters.choice')}</th>
            <th scope="col" className="text-end">{t('voters.votingPower')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.address}>
              <td><AddressChip address={item.address} linkToExplorer /></td>
              <td>
                <span className={`dao-v-status dao-v-status--${item.choice ? 'open' : 'failed'}`}>
                  {item.choice ? t('voters.yes') : t('voters.no')}
                </span>
              </td>
              <td className="text-end">
                {`${formatUnits(item.amount, decimals, i18n.language)} ${token.symbol || token.name || ''}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VotersTable;
