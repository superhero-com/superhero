/* eslint-disable */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, X,
} from 'lucide-react';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { useAeSdk } from '@/hooks/useAeSdk';
import { CONFIG } from '@/config';
import REGISTRY_WITH_EVENTS_ACI from '@/api/GovernanceRegistryACI.json';
import POLL_ACI from '@/api/GovernancePollACI.json';
import BYTECODE_HASHES from '@/api/GovernanceBytecodeHashes.json';
import {
  Encoded,
  type ContractMethodsBase,
} from '@aeternity/aepp-sdk';
import { initializeContractTyped } from '@/libs/initializeContractTyped';

type FormErrors = Partial<Record<'title' | 'description' | 'link' | 'options' | 'closeHeight', string>>;

type PollContractApi = ContractMethodsBase & {
  init: (
    metadata: unknown,
    options: unknown,
    closeHeight?: unknown,
    callOptions?: unknown,
  ) => Promise<{ address: string }>;
};

type GovernanceRegistryContractApi = ContractMethodsBase & {
  add_poll: (
    poll: Encoded.ContractAddress,
    is_listed: boolean,
    callOptions?: unknown,
  ) => Promise<{ decodedResult: number }>;
};

export default function GovernanceCreate() {
  const { t } = useTranslation('governance');
  const navigate = useNavigate();
  const {
    sdk, currentBlockHeight, sdkInitialized, activeAccount,
  } = useAeSdk();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [isListed, setIsListed] = useState(true);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [closeHeight, setCloseHeight] = useState<string>('');
  const [dateString, setDateString] = useState('');
  const [timeString, setTimeString] = useState('');
  const [showForumHint, setShowForumHint] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const height = currentBlockHeight || 0;

  // Compute close date estimation from height
  const closeDate = useMemo(() => {
    const ch = Number(closeHeight);
    if (!Number.isFinite(ch) || ch <= 0 || height <= 0) return null;
    if (ch - height <= 0) return null;
    return new Date(Date.now() + (ch - height) * 3 * 60 * 1000);
  }, [closeHeight, height]);

  useEffect(() => {
    if (closeDate) {
      const pad = (n: number) => String(n).padStart(2, '0');
      setDateString(`${closeDate.getFullYear()}-${pad(closeDate.getMonth() + 1)}-${pad(closeDate.getDate())}`);
      setTimeString(`${pad(closeDate.getHours())}:${pad(closeDate.getMinutes())}`);
    } else {
      setDateString('');
      setTimeString('');
    }
  }, [closeDate]);

  useEffect(() => {
    // default close height ~ 30 days
    if (height && !closeHeight) {
      setCloseHeight(String(20 * 24 * 30 + height));
    }
  }, [height]);

  const handleLinkBlur = () => {
    setShowForumHint(Boolean(link) && link.indexOf('forum.aeternity.com') === -1);
  };

  const addOptionRow = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    // Auto manage last empty row behavior
    if (next[next.length - 1].trim()) next.push('');
    if (next.length > 1 && !next[next.length - 2].trim()) next.pop();
    setOptions(next);
  };

  const removeOption = (idx: number) => {
    const next = options.filter((_, i) => i !== idx);
    if (next.length < 1) next.push('');
    setOptions(next);
  };

  const updateCloseHeightFromDate = () => {
    if (!dateString || !timeString || !height) return;
    const dt = new Date(`${dateString} ${timeString}`);
    const ch = Math.round((dt.getTime() - Date.now()) / 1000 / 60 / 3) + height;
    setCloseHeight(String(ch < 0 ? 0 : ch));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    const t_val = title.trim();
    const d = description.trim();
    const l = link.trim();
    const filledOptions = options.map((o) => o.trim()).filter(Boolean);

    if (t_val.length === 0) e.title = t('errors.titleRequired');
    if (t_val.length > 50) e.title = t('errors.titleTooLong');
    if (d.length === 0) e.description = t('errors.descriptionRequired');
    if (l.length === 0) e.link = t('errors.linkRequired');
    if (!/^https?:\/\//i.test(l)) e.link = t('errors.linkInvalid');
    if (filledOptions.length < 2) e.options = t('errors.optionsRequired');

    if (closeHeight === '') e.closeHeight = t('errors.closeHeightRequired');
    else if (!/^\d+$/.test(closeHeight)) e.closeHeight = t('errors.closeHeightInvalid');
    else if (Number(closeHeight) <= height && closeHeight !== '0') e.closeHeight = t('errors.closeHeightPast');

    setErrors(e);
    return Object.values(e).every((v) => !v);
  };

  async function onSubmit() {
    if (!sdkInitialized || !sdk) return;
    if (!activeAccount) {
      setErrors({ ...errors, title: t('errors.connectWallet') });
      return;
    }
    if (!validate()) return;

    try {
      setSubmitting(true);

      const pollBytecode = (BYTECODE_HASHES as any)['8.0.0']['Poll_Iris.aes'].bytecode as Encoded.ContractBytearray;
      const pollContract = await initializeContractTyped<PollContractApi>(sdk, {
        aci: POLL_ACI as any,
        bytecode: pollBytecode,
      });

      const createMetadata = {
        title: title.trim(),
        description: description.trim(),
        link: link.trim(),
        spec_ref: undefined as unknown as Uint8Array | undefined,
      };

      const cleanedOpts = options
        .map((o, i) => ({ i, t: o.trim() }))
        .filter((o) => !!o.t)
        .reduce((acc, { i, t }) => ({ ...acc, [i]: t }), {} as Record<number, string>);

      const ch = parseInt(closeHeight, 10);
      const close_height = ch === 0 ? undefined : ch;

      // Deploy poll contract
      const init = await pollContract.init(createMetadata as any, cleanedOpts as any, close_height as any, {
        omitUnknown: true,
        ttl: undefined,
      });
      const createdAddress = (init as any).address as string;

      // Add to registry
      const registry = await initializeContractTyped<GovernanceRegistryContractApi>(
        sdk,
        {
          aci: REGISTRY_WITH_EVENTS_ACI as any,
          address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
        },
      );
      await registry.add_poll(createdAddress as Encoded.ContractAddress, isListed, {
        ttl: undefined,
      });

      // Navigate to created poll (use on-chain id to resolve from backend list or use contract address route)
      navigate(`/voting/p/${createdAddress}`);
    } catch (e) {
      console.error(e);
      setErrors((prev) => ({ ...prev, title: t('errors.createFailed') }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link className="gov-back" to="/voting">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('experience.backToPolls')}
      </Link>
      <div className="gov-layout">
        <section className="gov-panel gov-form">
          <h1>{t('experience.newPoll')}</h1>
          <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} noValidate>
            {Object.values(errors).some(Boolean) && (
            <div role="alert" className="gov-inline-error">
              {t('messages.issuesWithInput')}
              <ul>{Object.values(errors).filter(Boolean).map((error, index) => <li key={index}>{error}</li>)}</ul>
            </div>
            )}
            <label className="gov-field">
              <span>
                {t('form.title')}
                {' '}
                <small>
                  {title.length}
                  /50
                </small>
              </span>
              <input value={title} maxLength={50} onChange={(event) => setTitle(event.target.value)} aria-invalid={!!errors.title} />
            </label>
            <label className="gov-field">
              <span>{t('form.description')}</span>
              <textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={!!errors.description} />
            </label>
            <label className="gov-field">
              <span>{t('form.link')}</span>
              <input type="url" value={link} onChange={(event) => setLink(event.target.value)} onBlur={handleLinkBlur} placeholder="https://" aria-invalid={!!errors.link} />
            </label>
            {showForumHint && <p className="gov-form-hint">{t('messages.forumHint')}</p>}
            <fieldset className="gov-form-options">
              <legend>{t('form.options')}</legend>
              {options.map((option, index) => (
                <div className="gov-option-field" key={index}>
                  <label className="gov-field">
                    <span className="sr-only">{t('experience.optionNumber', { number: index + 1 })}</span>
                    <input placeholder={t('experience.optionNumber', { number: index + 1 })} value={option} onChange={(event) => addOptionRow(index, event.target.value)} aria-invalid={!!errors.options} />
                  </label>
                  {option && <button type="button" className="gov-button ui-secondary" aria-label={t('experience.removeOption', { number: index + 1 })} onClick={() => removeOption(index)}><X size={16} aria-hidden="true" /></button>}
                </div>
              ))}
            </fieldset>
            <fieldset className="gov-form-options">
              <legend>{t('experience.visibility')}</legend>
              <div className="gov-filters">{[true, false].map((listed) => <button type="button" key={String(listed)} aria-pressed={isListed === listed} onClick={() => setIsListed(listed)}>{t(listed ? 'buttons.publiclyListed' : 'buttons.notListed')}</button>)}</div>
            </fieldset>
            <label className="gov-field">
              <span>{t('form.closeAtHeight')}</span>
              <input type="number" min="0" value={closeHeight} onChange={(event) => setCloseHeight(event.target.value)} aria-invalid={!!errors.closeHeight} />
            </label>
            <div className="gov-form-two">
              <label className="gov-field">
                <span>{t('form.estCloseDate')}</span>
                <input type="date" value={dateString} onChange={(event) => setDateString(event.target.value)} onBlur={updateCloseHeightFromDate} />
              </label>
              <label className="gov-field">
                <span>{t('form.estCloseTime')}</span>
                <input type="time" value={timeString} onChange={(event) => setTimeString(event.target.value)} onBlur={updateCloseHeightFromDate} />
              </label>
            </div>
            <p className="gov-form-hint">{t(closeHeight === '0' ? 'messages.neverClosing' : 'messages.neverClosingHint')}</p>
            <div className="gov-form-actions">
              {activeAccount ? (
                <button type="submit" className="gov-button ui-primary" disabled={submitting || !sdkInitialized}>
                  <Plus size={16} aria-hidden="true" />
                  {t(submitting ? 'buttons.creating' : 'buttons.createPoll')}
                </button>
              ) : <ConnectWalletButton className="gov-button ui-primary" />}
            </div>
          </form>
        </section>
        <aside className="gov-panel">
          <h2>{t('experience.beforePublish')}</h2>
          <p>{t('experience.createTransactions')}</p>
        </aside>
      </div>
    </>
  );
}
