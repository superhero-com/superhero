import {
  Link, useLocation, useNavigate, useParams,
} from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GovernanceAccount from '@/components/governance/GovernanceAccount';
import GovernancePolls from '@/components/governance/GovernancePolls';
import GovernanceVote from '@/components/governance/GovernanceVote';
import GovernanceCreate from '@/components/governance/GovernanceCreate';
import GovernanceHeader from '@/components/governance/GovernanceHeader';

const Governance = () => {
  const { t } = useTranslation('governance');
  const { id: pollId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const creating = pathname === '/voting/create';
  const account = pathname === '/voting/account';

  let content = <GovernancePolls />;
  if (pollId) content = <GovernanceVote key={pollId} pollId={pollId} setActiveTab={() => navigate('/voting')} />;
  else if (account) content = <GovernanceAccount />;
  else if (creating) content = <GovernanceCreate />;

  return (
    <main className="ui-page governance-page gov-page">
      <GovernanceHeader>
        <Link to="/voting/account" className="gov-button ui-secondary" aria-current={account ? 'page' : undefined}>
          <Wallet size={17} aria-hidden="true" />
          {t('experience.votingPower')}
        </Link>
        <Link to="/voting/create" className="gov-button ui-primary" aria-current={creating ? 'page' : undefined}>
          <Plus size={18} aria-hidden="true" />
          {t('experience.newPoll')}
        </Link>
      </GovernanceHeader>
      {content}
    </main>
  );
};

export default Governance;
