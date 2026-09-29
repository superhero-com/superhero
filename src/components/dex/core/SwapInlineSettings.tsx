import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDex } from '../../../hooks';

const SwapInlineSettings = ({
  id, onClose, title, hint,
}: { id: string; onClose: () => void; title?: string; hint?: string }) => {
  const { t } = useTranslation('dex');
  const {
    slippagePct, deadlineMins, setSlippage, setDeadline,
  } = useDex();
  const [slippage, setDraftSlippage] = useState(String(slippagePct));
  const [deadline, setDraftDeadline] = useState(String(deadlineMins));
  const valid = slippage.trim() !== '' && Number.isFinite(Number(slippage))
    && Number(slippage) >= 0 && Number(slippage) <= 50
    && deadline.trim() !== '' && Number.isInteger(Number(deadline))
    && Number(deadline) >= 1 && Number(deadline) <= 60;
  return (
    <section className="swap-settings" id={id} aria-label={title || t('swap.swapSettings')}>
      <div className="swap-settings__heading">
        <h3>{title || t('swap.swapSettings')}</h3>
        <button type="button" aria-label={t('swapCard.closeSettings')} onClick={onClose}><X aria-hidden="true" /></button>
      </div>
      <span className="swap-setting-label">{t('settings.slippageTolerance')}</span>
      <div className="swap-presets">
        {[0.5, 1, 5].map((preset) => (
          <button type="button" key={preset} aria-pressed={Number(slippage) === preset} onClick={() => setDraftSlippage(String(preset))}>
            {preset}
            %
          </button>
        ))}
        <label htmlFor={`${id}-slippage`}>
          <span className="sr-only">{t('swapCard.customSlippage')}</span>
          <input id={`${id}-slippage`} inputMode="decimal" value={slippage} onChange={(event) => setDraftSlippage(event.target.value)} />
          <span>%</span>
        </label>
      </div>
      <p>{hint || t('swapCard.slippageHint')}</p>
      <label className="swap-deadline" htmlFor={`${id}-deadline`}>
        {t('settings.transactionDeadline')}
        <span>
          <input id={`${id}-deadline`} aria-label={t('swapCard.deadlineMinutes')} inputMode="numeric" value={deadline} onChange={(event) => setDraftDeadline(event.target.value)} />
          {t('swapCard.minutes')}
        </span>
      </label>
      <div className="swap-settings__actions">
        <button type="button" onClick={onClose}>{t('settings.cancel')}</button>
        <button type="button" disabled={!valid} onClick={() => { setSlippage(Number(slippage)); setDeadline(Number(deadline)); onClose(); }}>{t('settings.save')}</button>
      </div>
    </section>
  );
};
export default SwapInlineSettings;
