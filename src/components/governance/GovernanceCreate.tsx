import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AeButton from '@/components/AeButton';
import MobileInput from '@/components/MobileInput';
import MobileCard from '@/components/MobileCard';
import { useAeSdk } from '@/hooks/useAeSdk';
import { CONFIG } from '@/config';
import REGISTRY_WITH_EVENTS_ACI from '@/api/GovernanceRegistryACI.json';
import POLL_ACI from '@/api/GovernancePollACI.json';
import BYTECODE_HASHES from '@/api/GovernanceBytecodeHashes.json';
import { Contract, Encoded } from '@aeternity/aepp-sdk';

type FormErrors = Partial<Record<'title' | 'description' | 'link' | 'options' | 'closeHeight', string>>;

export default function GovernanceCreate() {
  const navigate = useNavigate();
  const { sdk, currentBlockHeight, sdkInitialized, activeAccount } = useAeSdk();

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
    const t = title.trim();
    const d = description.trim();
    const l = link.trim();
    const filledOptions = options.map((o) => o.trim()).filter(Boolean);

    if (t.length === 0) e.title = 'Please provide a title.';
    if (t.length > 50) e.title = 'Your title is too long (50 chars max).';
    if (d.length === 0) e.description = 'Please provide a description.';
    if (l.length === 0) e.link = 'Please provide a link.';
    if (!/^https?:\/\//i.test(l)) e.link = 'Your link must include http:// or https://.';
    if (filledOptions.length < 2) e.options = 'Please provide at least two options.';

    if (closeHeight === '') e.closeHeight = 'Please provide a closing height.';
    else if (!/^\d+$/.test(closeHeight)) e.closeHeight = 'The closing height is not a whole number.';
    else if (Number(closeHeight) <= height && closeHeight !== '0') e.closeHeight = 'The closing height lies in the past.';

    setErrors(e);
    return Object.values(e).every((v) => !v);
  };

  async function onSubmit() {
    if (!sdkInitialized || !sdk) return;
    if (!activeAccount) {
      setErrors({ ...errors, title: 'Connect wallet to create a poll.' });
      return;
    }
    if (!validate()) return;

    try {
      setSubmitting(true);

      const pollBytecode = (BYTECODE_HASHES as any)["8.0.0"]["Poll_Iris.aes"].bytecode as Encoded.ContractBytearray;
      const pollContract = await sdk.initializeContract({ aci: POLL_ACI as any, bytecode: pollBytecode });

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
      const registry = await Contract.initialize<{
        add_poll: (poll: any, is_listed: boolean) => Promise<{ decodedResult: number }>
      }>({
        ...sdk.getContext(),
        aci: REGISTRY_WITH_EVENTS_ACI as any,
        address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
      });
      await registry.add_poll(createdAddress as Encoded.ContractAddress, isListed, {
        ttl: undefined,
      });

      // Navigate to created poll (use on-chain id to resolve from backend list or use contract address route)
      navigate(`/voting/p/${createdAddress}`);
    } catch (e) {
      console.error(e);
      setErrors((prev) => ({ ...prev, title: 'Could not create your poll. Please try again.' }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-6 px-4 md:px-6 py-6 max-w-3xl mx-auto">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-black/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent m-0">Create Poll</h1>
            <p className="text-slate-300 mt-2">Use the form below to create a new governance poll.</p>
          </div>
        </div>

        {(Object.values(errors).some(Boolean)) && (
          <MobileCard variant="outlined" padding="small" className="bg-red-500/10 border-red-500/30">
            <div className="text-red-300 font-medium mb-1">There are issues with your input:</div>
            <ul className="m-0 ps-5 text-red-200 text-sm">
              {Object.values(errors).filter(Boolean).map((e, i) => (
                <li key={i} className="list-disc">{e}</li>
              ))}
            </ul>
          </MobileCard>
        )}

        <MobileInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title || undefined} />
        <MobileInput label="Description" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description || undefined} />

        {showForumHint && (
          <MobileCard variant="outlined" padding="small" className="bg-white/5 border-white/10 text-slate-200">
            For easier discussions we suggest creating a thread in the æternity forum and linking it here (https://forum.aeternity.com).
          </MobileCard>
        )}

        <MobileInput label="Link" value={link} onChange={(e) => setLink(e.target.value)} onBlur={handleLinkBlur} error={errors.link || undefined} />

        <div className="flex gap-2">
          <AeButton onClick={() => setIsListed(true)} className={isListed ? 'bg-pink-600 text-white' : 'bg-white/10'}>Publicly Listed</AeButton>
          <AeButton onClick={() => setIsListed(false)} className={!isListed ? 'bg-pink-600 text-white' : 'bg-white/10'}>Not Listed</AeButton>
        </div>

        <div className="space-y-2">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <MobileInput label={idx === 0 ? 'Options' : undefined} placeholder="Add Option"
                value={opt} onChange={(e) => addOptionRow(idx, e.target.value)} error={errors.options || undefined} />
              {opt && (
                <AeButton onClick={() => removeOption(idx)} className="bg-white/10">✕</AeButton>
              )}
            </div>
          ))}
        </div>

        <div>
          <MobileInput label="Close at height" type="number" value={closeHeight} onChange={(e) => setCloseHeight(e.target.value)} error={errors.closeHeight || undefined} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MobileInput label="Est. close date" type="date" value={dateString} onChange={(e) => setDateString(e.target.value)} onBlur={updateCloseHeightFromDate} />
            <MobileInput label="Est. close time" type="time" value={timeString} onChange={(e) => setTimeString(e.target.value)} onBlur={updateCloseHeightFromDate} />
          </div>
          <div className="text-slate-400 text-sm p-2">
            {closeHeight && Number(closeHeight) > height && (
              <span>To create a never closing poll, set close height to 0.</span>
            )}
            {closeHeight && Number(closeHeight) < height && closeHeight !== '0' && (
              <span> Current height is {height} and closing height {closeHeight} lies in the past.</span>
            )}
            {closeHeight === '0' && (
              <span> This poll will never close.</span>
            )}
          </div>
        </div>

        <div className="sticky bottom-4">
          <AeButton onClick={onSubmit} disabled={submitting} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            {submitting ? 'Creating...' : 'Create Poll'}
          </AeButton>
        </div>
      </div>
    </div>
  );
}


