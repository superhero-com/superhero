import {
  CircleCheckBig, Clock3, Lock, ShieldCheck, Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DAO_VOTE_RULES, formatBlockDuration } from '../utils/voteRules';

/** "How this vote works": the contract rules in plain words. */
const VoteRulesCard = ({ voteTimeout }: { voteTimeout?: number }) => {
  const { t, i18n } = useTranslation('dao');
  const applyWindow = voteTimeout != null ? formatBlockDuration(voteTimeout, i18n.language) : '';
  const duration = formatBlockDuration(DAO_VOTE_RULES.durationBlocks, i18n.language);

  return (
    <section className="dao-v-card dao-v-rules" aria-labelledby="dao-v-rules-title">
      <h3 id="dao-v-rules-title">
        <ShieldCheck aria-hidden="true" />
        {t('voting.rules.title')}
      </h3>
      <ul>
        <li>
          <Clock3 aria-hidden="true" />
          <span>
            <strong>{t('voting.rules.durationTitle', { duration })}</strong>
            {' '}
            {t('voting.rules.durationText')}
          </span>
        </li>
        <li>
          <Users aria-hidden="true" />
          <span>
            <strong>{t('voting.rules.passTitle', { percent: DAO_VOTE_RULES.passYesPercent })}</strong>
            {' '}
            {t('voting.rules.passText', { percent: DAO_VOTE_RULES.passTurnoutPercent })}
          </span>
        </li>
        <li>
          <Lock aria-hidden="true" />
          <span>
            <strong>{t('voting.rules.lockTitle')}</strong>
            {' '}
            {t('voting.rules.lockText')}
          </span>
        </li>
        <li>
          <CircleCheckBig aria-hidden="true" />
          <span>
            <strong>
              {applyWindow
                ? t('voting.rules.applyTitle', { window: applyWindow })
                : t('voting.rules.applyTitleShort')}
            </strong>
            {' '}
            {t('voting.rules.applyText')}
          </span>
        </li>
      </ul>
    </section>
  );
};

export default VoteRulesCard;
