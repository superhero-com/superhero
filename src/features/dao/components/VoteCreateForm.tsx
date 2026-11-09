import { ReactElement, useState } from 'react';
import { Encoded, Encoding, isAddressValid } from '@aeternity/aepp-sdk';
import BigNumber from 'bignumber.js';
import { VOTE_TYPE, VoteMetadata, VoteSubject } from 'bctsl-sdk';
import {
  ChevronLeft, ChevronRight, Coins, HandCoins, Repeat, SlidersHorizontal, UserMinus, UserPlus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { safeHref } from '@/utils/safeHref';
import { DAO_VOTE_RULES, formatBlockDuration, formatUnits } from '../utils/voteRules';
import { daoErrorKey } from '../utils/daoErrors';

export type CreateKind = 'payout' | 'payoutAll' | 'addModerator' | 'removeModerator' | 'minimumTokens' | 'changeDao';

const KINDS: { kind: CreateKind; Icon: typeof Coins }[] = [
  { kind: 'payout', Icon: HandCoins },
  { kind: 'payoutAll', Icon: Coins },
  { kind: 'addModerator', Icon: UserPlus },
  { kind: 'removeModerator', Icon: UserMinus },
  { kind: 'minimumTokens', Icon: SlidersHorizontal },
  { kind: 'changeDao', Icon: Repeat },
];

const ACCOUNT_KINDS: CreateKind[] = ['payout', 'payoutAll', 'addModerator', 'removeModerator'];

export interface CreateDraft {
  kind: CreateKind;
  account: string;
  amount: string;
  description: string;
  link: string;
}

export type CreateErrors = Partial<Record<'account' | 'amount' | 'description' | 'link', string>>;

const toBaseUnits = (value: string) => BigInt(
  new BigNumber(value).shiftedBy(18).integerValue(BigNumber.ROUND_DOWN).toFixed(),
);

/** `pct` percent of an aettos amount, in AE with two decimals, rounded down. */
const percentOf = (aettos: bigint, pct: number) => new BigNumber(aettos.toString())
  .times(pct)
  .div(100)
  .shiftedBy(-18)
  .decimalPlaces(2, BigNumber.ROUND_DOWN)
  .toFixed();

/** Checks a draft the way the contracts will; returns i18n keys under `dao`. */
export function validateDraft(draft: CreateDraft, treasuryAettos?: bigint): CreateErrors {
  const errors: CreateErrors = {};
  const account = draft.account.trim();
  if (ACCOUNT_KINDS.includes(draft.kind)) {
    if (!account) errors.account = 'voting.create.errors.accountRequired';
    else if (!isAddressValid(account, Encoding.AccountAddress)) errors.account = 'voting.create.errors.accountInvalid';
  }
  if (draft.kind === 'changeDao') {
    if (!account) errors.account = 'voting.create.errors.daoRequired';
    else if (!isAddressValid(account, Encoding.ContractAddress)) errors.account = 'voting.create.errors.daoInvalid';
  }
  if (draft.kind === 'payout' || draft.kind === 'minimumTokens') {
    const amount = new BigNumber(draft.amount.trim());
    if (!draft.amount.trim()) errors.amount = 'voting.create.errors.amountRequired';
    else if (!amount.isFinite() || (draft.kind === 'payout' ? amount.lte(0) : amount.lt(0))) {
      errors.amount = 'voting.create.errors.amountInvalid';
    } else if (amount.decimalPlaces()! > 18) errors.amount = 'voting.create.errors.amountInvalid';
    else if (draft.kind === 'payout' && treasuryAettos != null && toBaseUnits(draft.amount.trim()) > treasuryAettos) {
      errors.amount = 'voting.create.errors.amountOverTreasury';
    }
  }
  const description = draft.description.trim();
  if (!description) errors.description = 'voting.create.errors.descriptionRequired';
  else if (description.length > DAO_VOTE_RULES.descriptionMaxLength) errors.description = 'voting.create.errors.descriptionTooLong';
  const link = draft.link.trim();
  if (link && !safeHref(link)) errors.link = 'voting.create.errors.linkInvalid';
  return errors;
}

export function draftToMetadata(draft: CreateDraft): VoteMetadata {
  const account = draft.account.trim();
  const amount = draft.amount.trim();
  let subject: VoteSubject;
  switch (draft.kind) {
    case 'payout':
      subject = { [VOTE_TYPE.VotePayoutAmount]: [account as Encoded.AccountAddress, toBaseUnits(amount)] };
      break;
    case 'payoutAll':
      subject = { [VOTE_TYPE.VotePayout]: [account as Encoded.AccountAddress] };
      break;
    case 'addModerator':
      subject = { [VOTE_TYPE.AddModerator]: [account as Encoded.AccountAddress] };
      break;
    case 'removeModerator':
      subject = { [VOTE_TYPE.DeleteModerator]: [account as Encoded.AccountAddress] };
      break;
    case 'minimumTokens':
      subject = { [VOTE_TYPE.ChangeMinimumTokenThreshold]: [toBaseUnits(amount)] };
      break;
    case 'changeDao':
    default:
      // The contract takes the new DAO as an `address`, which is the contract key with an ak_ prefix.
      subject = { [VOTE_TYPE.ChangeDAO]: [account.replace(/^ct_/, 'ak_') as Encoded.AccountAddress] };
      break;
  }
  return { subject, description: draft.description.trim(), link: draft.link.trim() };
}

interface VoteCreateFormProps {
  tokenLabel: string;
  tokenSymbol: string;
  treasuryAettos?: bigint;
  /** Account AE balance in aettos, when a wallet is connected. */
  aeBalanceAettos?: bigint;
  connected: boolean;
  onCancel: () => void;
  onCreate: (metadata: VoteMetadata) => Promise<void>;
}

const VoteCreateForm = ({
  tokenLabel, tokenSymbol, treasuryAettos, aeBalanceAettos, connected, onCancel, onCreate,
}: VoteCreateFormProps) => {
  const { t, i18n } = useTranslation('dao');
  const [step, setStep] = useState<'details' | 'review'>('details');
  const [draft, setDraft] = useState<CreateDraft>({
    kind: 'payout', account: '', amount: '', description: '', link: '',
  });
  const [errors, setErrors] = useState<CreateErrors>({});
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const update = (field: keyof CreateDraft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    if (errors[field as keyof CreateErrors]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const treasury = treasuryAettos != null ? formatUnits(treasuryAettos, 18, i18n.language) : undefined;
  const needsAccount = draft.kind !== 'minimumTokens';
  const needsAmount = draft.kind === 'payout' || draft.kind === 'minimumTokens';
  const notEnoughAe = aeBalanceAettos != null && aeBalanceAettos < DAO_VOTE_RULES.createFeeAettos;
  const fee = DAO_VOTE_RULES.createFeeAe.toLocaleString(i18n.language);

  const review = () => {
    const next = validateDraft(draft, treasuryAettos);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setStep('review');
      setSubmitError(undefined);
    }
  };

  const create = async () => {
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await onCreate(draftToMetadata(draft));
    } catch (error) {
      setSubmitError(t(daoErrorKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    name: keyof CreateErrors,
    label: string,
    help: string | undefined,
    control: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string }) => ReactElement,
  ) => {
    const id = `dao-v-${name}`;
    return (
      <div className="dao-v-field">
        <label htmlFor={id}>{label}</label>
        {control({ id, 'aria-invalid': !!errors[name], 'aria-describedby': `${id}-help` })}
        {errors[name]
          ? <p className="dao-v-error" id={`${id}-help`} role="alert">{t(errors[name]!)}</p>
          : help && <p className="dao-v-help" id={`${id}-help`}>{help}</p>}
      </div>
    );
  };

  const actionText = t(`voting.create.action.${draft.kind}`, {
    amount: draft.amount.trim() ? new BigNumber(draft.amount.trim()).toNumber().toLocaleString(i18n.language) : '',
    symbol: tokenSymbol,
  });

  if (step === 'review') {
    return (
      <section className="dao-v-card" aria-labelledby="dao-v-create-title">
        <button type="button" className="dao-v-back" onClick={() => setStep('details')}>
          <ChevronLeft size={16} aria-hidden="true" />
          {t('voting.create.editDetails')}
        </button>
        <div className="dao-v-panel-head">
          <h2 id="dao-v-create-title">{t('voting.create.reviewTitle')}</h2>
          <span className="dao-v-muted">{t('voting.create.step', { step: 2, total: 2 })}</span>
        </div>
        <dl className="dao-v-summary">
          <div>
            <dt>{t('voting.create.summary.action')}</dt>
            <dd>{actionText}</dd>
          </div>
          {needsAccount && (
            <div>
              <dt>{t(`voting.create.accountLabelShort.${draft.kind}`)}</dt>
              <dd>{draft.account.trim()}</dd>
            </div>
          )}
          <div>
            <dt>{t('voting.create.summary.why')}</dt>
            <dd dir="auto">{draft.description.trim()}</dd>
          </div>
          {draft.link.trim() && (
            <div>
              <dt>{t('voting.create.summary.link')}</dt>
              <dd>{draft.link.trim()}</dd>
            </div>
          )}
          <div>
            <dt>{t('voting.create.summary.ends')}</dt>
            <dd>
              {t('voting.create.summary.endsValue', {
                duration: formatBlockDuration(DAO_VOTE_RULES.durationBlocks, i18n.language),
              })}
            </dd>
          </div>
        </dl>
        <div className="dao-v-note dao-v-note--warn">
          <Coins aria-hidden="true" />
          <div>
            <strong>{t('voting.create.feeTitle', { fee })}</strong>
            <p>{t('voting.create.feeText', { token: tokenLabel })}</p>
          </div>
        </div>
        {notEnoughAe && (
          <div className="dao-v-note dao-v-note--error" role="alert">
            <p>{t('voting.create.notEnoughAe', { fee })}</p>
          </div>
        )}
        <label className="dao-v-confirm" htmlFor="dao-v-fee-ack">
          <input id="dao-v-fee-ack" type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>{t('voting.create.ack', { fee })}</span>
        </label>
        {submitError && (
          <div className="dao-v-note dao-v-note--error" role="alert"><p>{submitError}</p></div>
        )}
        <div className="dao-v-actions">
          <Button type="button" variant="outline" className="dao-v-btn ui-secondary" onClick={() => setStep('details')}>
            {t('voting.create.back')}
          </Button>
          {connected ? (
            <Button
              type="button"
              className="dao-v-btn ui-primary"
              disabled={!ack || submitting || notEnoughAe}
              aria-busy={submitting}
              onClick={create}
            >
              {submitting ? t('voting.create.creating') : t('voting.create.submit', { fee })}
            </Button>
          ) : (
            <ConnectWalletButton label={t('voting.create.connectToCreate')} className="dao-v-btn" />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="dao-v-card" aria-labelledby="dao-v-create-title">
      <div className="dao-v-panel-head">
        <h2 id="dao-v-create-title">{t('voting.create.title')}</h2>
        <span className="dao-v-muted">{t('voting.create.step', { step: 1, total: 2 })}</span>
      </div>
      <fieldset className="dao-v-types">
        <legend>{t('voting.create.whatLabel')}</legend>
        {KINDS.map(({ kind, Icon }) => (
          <label
            key={kind}
            htmlFor={`dao-v-type-${kind}`}
            className={`dao-v-type${draft.kind === kind ? ' is-checked' : ''}`}
          >
            <input
              id={`dao-v-type-${kind}`}
              type="radio"
              name="dao-v-kind"
              value={kind}
              checked={draft.kind === kind}
              onChange={() => {
                setDraft((d) => ({ ...d, kind }));
                setErrors({});
              }}
            />
            <Icon aria-hidden="true" />
            <span>
              <strong>{t(`voting.create.kinds.${kind}.title`)}</strong>
              <small>{t(`voting.create.kinds.${kind}.text`, { symbol: tokenSymbol })}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {needsAmount && field(
        'amount',
        draft.kind === 'payout' ? t('voting.create.amountLabel') : t('voting.create.minimumLabel', { symbol: tokenSymbol }),
        draft.kind === 'payout' && treasury
          ? t('voting.create.amountHelp', { treasury })
          : t('voting.create.minimumHelp', { symbol: tokenSymbol }),
        (props) => (
          <div className="dao-v-amount">
            <Input
              {...props}
              className="dao-v-input"
              inputMode="decimal"
              autoComplete="off"
              value={draft.amount}
              placeholder="0"
              onChange={(e) => update('amount', e.target.value.replace(',', '.'))}
            />
            <span>{draft.kind === 'payout' ? 'AE' : tokenSymbol}</span>
          </div>
        ),
      )}
      {draft.kind === 'payout' && treasuryAettos != null && treasuryAettos > 0n && (
        <div className="dao-v-quick" role="group" aria-label={t('voting.create.quickAmounts')}>
          {[10, 25, 50].map((pct) => (
            <Button
              key={pct}
              type="button"
              variant="outline"
              className="dao-v-btn ui-secondary"
              onClick={() => update('amount', percentOf(treasuryAettos, pct))}
            >
              {t('voting.create.percentOfTreasury', { percent: pct })}
            </Button>
          ))}
        </div>
      )}
      {needsAccount && field(
        'account',
        t(`voting.create.accountLabel.${draft.kind}`),
        t(draft.kind === 'changeDao' ? 'voting.create.daoHelp' : 'voting.create.accountHelp'),
        (props) => (
          <Input
            {...props}
            className="dao-v-input font-mono"
            autoComplete="off"
            spellCheck={false}
            value={draft.account}
            placeholder={draft.kind === 'changeDao' ? 'ct_…' : 'ak_…'}
            onChange={(e) => update('account', e.target.value)}
          />
        ),
      )}

      {field(
        'description',
        t('voting.create.descriptionLabel'),
        t('voting.create.descriptionHelp', {
          count: draft.description.trim().length,
          max: DAO_VOTE_RULES.descriptionMaxLength,
        }),
        (props) => (
          <Textarea
            {...props}
            className="dao-v-input"
            dir="auto"
            value={draft.description}
            maxLength={DAO_VOTE_RULES.descriptionMaxLength}
            onChange={(e) => update('description', e.target.value)}
          />
        ),
      )}

      {field(
        'link',
        t('voting.create.linkLabel'),
        t('voting.create.linkHelp'),
        (props) => (
          <Input
            {...props}
            className="dao-v-input"
            type="url"
            inputMode="url"
            value={draft.link}
            placeholder="https://"
            onChange={(e) => update('link', e.target.value)}
          />
        ),
      )}

      <div className="dao-v-actions">
        <Button type="button" variant="outline" className="dao-v-btn ui-secondary" onClick={onCancel}>
          {t('voting.create.cancel')}
        </Button>
        <Button type="button" className="dao-v-btn ui-primary" onClick={review}>
          {t('voting.create.review')}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
};

export default VoteCreateForm;
