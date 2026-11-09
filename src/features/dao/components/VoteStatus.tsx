import { Clock3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  DAO_VOTE_RULES,
  DaoVoteStatus,
  DaoVoteTally,
  formatPercent,
  relativeBlocks,
} from '../utils/voteRules';

export const VoteStatusBadge = ({ status }: { status: DaoVoteStatus }) => {
  const { t } = useTranslation('dao');
  return (
    <Badge variant="outline" className={`dao-v-status dao-v-status--${status}`}>
      {t(`voting.status.${status}`)}
    </Badge>
  );
};

interface VoteTimeProps {
  status: DaoVoteStatus;
  closeHeight: number;
  height: number;
  voteTimeout?: number;
}

/** When the vote ends, or by when a passed vote has to be applied. */
export const VoteTime = ({
  status, closeHeight, height, voteTimeout,
}: VoteTimeProps) => {
  const { t, i18n } = useTranslation('dao');
  let text: string;
  if (status === 'open') {
    text = t('voting.time.ends', { when: relativeBlocks(closeHeight - height, i18n.language) });
  } else if (status === 'passed' && voteTimeout != null) {
    text = t('voting.time.applyBy', { when: relativeBlocks(closeHeight + voteTimeout - height, i18n.language) });
  } else {
    text = t('voting.time.ended', { when: relativeBlocks(closeHeight - height, i18n.language) });
  }
  return (
    <span className="dao-v-when">
      <Clock3 aria-hidden="true" />
      {text}
    </span>
  );
};

const Meter = ({
  label, value, need, met,
}: { label: string; value: number; need: number; met: boolean }) => (
  <div
    className={`dao-v-meter${met ? ' is-met' : ''}`}
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value)}
  >
    <span style={{ width: `${Math.min(100, value)}%` }} />
    <i style={{ insetInlineStart: `${need}%` }} aria-hidden="true" />
  </div>
);

interface VoteMetersProps {
  tally: DaoVoteTally;
  status: DaoVoteStatus;
  /** Shows the explanation line under the bars. */
  withNote?: boolean;
}

/** Yes share vs the pass mark and turnout vs the quorum, with the threshold as a tick. */
export const VoteMeters = ({ tally, status, withNote = false }: VoteMetersProps) => {
  const { t, i18n } = useTranslation('dao');
  const yesNeed = DAO_VOTE_RULES.passYesPercent;
  const turnoutNeed = DAO_VOTE_RULES.passTurnoutPercent;
  const yesMet = tally.total > 0n && tally.yesPercent >= yesNeed;
  const turnoutMet = tally.turnoutPercent >= turnoutNeed;
  const yes = formatPercent(tally.yesPercent, i18n.language);
  const turnout = formatPercent(tally.turnoutPercent, i18n.language);

  let note = '';
  if (status === 'open') {
    if (yesMet && turnoutMet) note = t('voting.meters.passingSoFar');
    else if (!turnoutMet) note = t('voting.meters.needsTurnout');
    else note = t('voting.meters.needsYes');
  }

  return (
    <div className="dao-v-meters">
      <div className="dao-v-meter-row">
        <span>{t('voting.meters.yes')}</span>
        <strong>{`${yes}%`}</strong>
        <span className="dao-v-muted">{t('voting.meters.yesNeed', { percent: yesNeed })}</span>
      </div>
      <Meter
        label={t('voting.meters.yesAria', { percent: yes, need: yesNeed })}
        value={tally.yesPercent}
        need={yesNeed}
        met={yesMet}
      />
      <div className="dao-v-meter-row">
        <span>{t('voting.meters.turnout')}</span>
        <strong>{`${turnout}%`}</strong>
        <span className="dao-v-muted">{t('voting.meters.turnoutNeed', { percent: turnoutNeed })}</span>
      </div>
      <Meter
        label={t('voting.meters.turnoutAria', { percent: turnout, need: turnoutNeed })}
        value={tally.turnoutPercent}
        need={turnoutNeed}
        met={turnoutMet}
      />
      {withNote && note && <p className="dao-v-meter-note">{note}</p>}
    </div>
  );
};
