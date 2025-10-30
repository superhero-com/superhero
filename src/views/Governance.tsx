import { useParams, useLocation } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import GovernancePolls from '@/components/governance/GovernancePolls';
import GovernanceVote from '@/components/governance/GovernanceVote';
import GovernanceCreate from '@/components/governance/GovernanceCreate';

export default function Governance() {
  const { id: pollId } = useParams();
  const location = useLocation();

  const isCreate = location.pathname.endsWith('/create');
  const isDetail = !!pollId && location.pathname.includes('/voting/poll/');

  return (
    <Shell>
      {isCreate ? (
        <GovernanceCreate />
      ) : isDetail ? (
        <GovernanceVote pollId={pollId!} setActiveTab={() => {}} />
      ) : (
        <GovernancePolls />
      )}
    </Shell>
  );
}


