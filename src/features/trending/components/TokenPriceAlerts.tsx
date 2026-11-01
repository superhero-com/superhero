import { useId, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BellRing, Trash2 } from 'lucide-react';
import { Decimal } from '@/libs/decimal';
import {
  PriceAlertsApi,
  normalizeTargetAe,
  type PriceAlert,
  type PriceAlertDirection,
} from '@/features/notifications/priceAlerts';
import { apiBaseUrl, useNotificationSigner } from '@/features/notifications/useNotifications';
import './TokenPriceAlerts.css';

const priceAlertsKey = (account: string | undefined) => ['price-alerts', account];

interface TokenPriceAlertsProps {
  saleAddress?: string;
  symbol?: string;
  /** Current price in AE, used to suggest the direction. */
  priceAe?: string | number | null;
}

/**
 * "Notify me when this token goes above/below X AE" (superhero#307). Alerts
 * fire once through the notification bell and push; each change takes one
 * wallet signature.
 */
const TokenPriceAlerts = ({ saleAddress, symbol, priceAe }: TokenPriceAlertsProps) => {
  const { t } = useTranslation('trending');
  const { activeAccount, signNotificationMessage } = useNotificationSigner();
  const queryClient = useQueryClient();
  const api = useMemo(() => new PriceAlertsApi({ baseUrl: apiBaseUrl() }), []);
  const inputId = useId();
  const [direction, setDirection] = useState<PriceAlertDirection>('above');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The backend allows 10 requests a minute per IP on this route, creates
  // included: every token page shares one cached list per account, and a
  // failed read is not retried (the list just stays empty).
  const { data: accountAlerts } = useQuery({
    queryKey: priceAlertsKey(activeAccount),
    queryFn: () => api.list(activeAccount!),
    enabled: !!activeAccount,
    staleTime: 60_000,
    retry: false,
  });

  if (!activeAccount || !saleAddress) return null;

  const normalized = normalizeTargetAe(target);
  const current = Number(priceAe);
  const hasPrice = Number.isFinite(current) && current > 0;
  const name = symbol || t('priceAlerts.thisToken');
  const alerts = (accountAlerts ?? []).filter((a) => a.sale_address === saleAddress);

  const updateAlerts = async (update: (list: PriceAlert[]) => PriceAlert[]) => {
    const key = priceAlertsKey(activeAccount);
    // A read already in flight may predate this change; drop it.
    await queryClient.cancelQueries({ queryKey: key });
    if (!queryClient.setQueryData<PriceAlert[]>(key, (list) => list && update(list))) {
      // The list never loaded; fetch it rather than show part of it.
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    if (!normalized) {
      setError(t('priceAlerts.invalidTarget'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.create(
        activeAccount,
        saleAddress,
        direction,
        normalized,
        signNotificationMessage,
      );
      await updateAlerts((list) => [created, ...list.filter((a) => a.id !== created.id)]);
      setTarget('');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('priceAlerts.failed'));
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (id: number) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.remove(activeAccount, id, signNotificationMessage);
      await updateAlerts((list) => list.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('priceAlerts.failed'));
    } finally {
      setBusy(false);
    }
  };

  const onTargetChange = (value: string) => {
    setTarget(value);
    setError(null);
    setSaved(false);
    const n = Number(normalizeTargetAe(value));
    if (hasPrice && Number.isFinite(n) && n > 0) {
      setDirection(n > current ? 'above' : 'below');
    }
  };

  const active = alerts.filter((a) => !a.triggered_at);
  const fired = alerts.filter((a) => a.triggered_at);

  return (
    <section className="token-price-alerts" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`}>
        <BellRing aria-hidden="true" />
        {t('priceAlerts.title')}
      </h2>
      <p className="token-price-alerts__hint">{t('priceAlerts.hint', { name })}</p>
      <form className="token-price-alerts__form" onSubmit={onCreate}>
        <select
          aria-label={t('priceAlerts.direction')}
          value={direction}
          onChange={(e) => setDirection(e.target.value as PriceAlertDirection)}
          disabled={busy}
        >
          <option value="above">{t('priceAlerts.above')}</option>
          <option value="below">{t('priceAlerts.below')}</option>
        </select>
        <label htmlFor={inputId} className="sr-only">{t('priceAlerts.target')}</label>
        <div className="token-price-alerts__amount">
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            placeholder={hasPrice ? Decimal.from(priceAe as string | number).toString() : '0.01'}
            value={target}
            onChange={(e) => onTargetChange(e.target.value)}
            disabled={busy}
            aria-invalid={!!target && !normalized}
          />
          <span>AE</span>
        </div>
        <button type="submit" disabled={busy || !target.trim()}>
          {busy ? t('priceAlerts.signing') : t('priceAlerts.set')}
        </button>
      </form>
      {error && <p className="token-price-alerts__error" role="alert">{error}</p>}
      {saved && <p className="token-price-alerts__saved" role="status">{t('priceAlerts.saved')}</p>}
      {active.length > 0 && (
        <ul className="token-price-alerts__list" aria-label={t('priceAlerts.active')}>
          {active.map((a) => (
            <li key={a.id}>
              <span>
                {t(a.direction === 'above' ? 'priceAlerts.whenAbove' : 'priceAlerts.whenBelow', {
                  target: a.target_ae,
                })}
              </span>
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                disabled={busy}
                aria-label={t('priceAlerts.remove')}
                title={t('priceAlerts.remove')}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {fired.length > 0 && (
        <p className="token-price-alerts__fired">
          {t('priceAlerts.firedCount', { count: fired.length })}
        </p>
      )}
    </section>
  );
};

export default TokenPriceAlerts;
