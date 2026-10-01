import {
  useEffect, useId, useRef, useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, ArrowUpRight, ArrowDownUp, ChevronDown, ChevronUp, Check, Clock3,
  X, History, MoreHorizontal, Trash2, Wallet, Box, Layers, Globe2, Copy,
} from 'lucide-react';
import { DexService } from '@/api/generated';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CONFIG } from '@/config';
import { copyToClipboard } from '@/utils/address';
import { useAccount } from '@/hooks/useAccount';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useTransactionStatus } from '@/hooks/useTransactionStatus';
import type { RecentActivity as Activity, TransactionStatus } from '../types/dex';
import {
  activityAmount, activityKey, activityStatus, sameActivityStatus,
} from './recentActivityData';
import './RecentActivity.css';

const typeKeys: Record<Activity['type'], string> = {
  swap: 'swap',
  wrap: 'wrap',
  unwrap: 'unwrap',
  bridge: 'bridge',
  add_liquidity: 'addLiquidity',
  remove_liquidity: 'removeLiquidity',
};
const icons = {
  swap: ArrowDownUp,
  wrap: Box,
  unwrap: Box,
  bridge: Globe2,
  add_liquidity: Layers,
  remove_liquidity: Layers,
};

const ActivityToken = ({ value }: { value?: string }) => {
  const contract = !!value?.startsWith('ct_') && value !== CONFIG.DEX_WAE;
  const { data } = useQuery({
    queryKey: ['DexService.getDexTokenByAddress', value],
    queryFn: async ({ signal }) => {
      const request = DexService.getDexTokenByAddress({ address: value! });
      const cancel = () => request.cancel();
      signal.addEventListener('abort', cancel, { once: true });
      try { return await request; } finally { signal.removeEventListener('abort', cancel); }
    },
    enabled: contract,
    staleTime: 300000,
  });
  let symbol = value || '—';
  if (value === CONFIG.DEX_WAE) symbol = 'WAE';
  else if (contract) symbol = data?.symbol || `${value!.slice(0, 7)}…${value!.slice(-4)}`;
  return <bdi title={value}>{symbol}</bdi>;
};

const ActivityRow = ({
  activity, expanded, onToggle, account, onStatus, now,
}: {
  activity: Activity;
  expanded: boolean;
  onToggle: () => void;
  account: string;
  onStatus: (account: string, hash: string, status: Activity['status']) => void;
  now: number;
}) => {
  const { t, i18n } = useTranslation('dex');
  const id = useId();
  const [copied, setCopied] = useState<boolean | null>(null);
  const terminal = activity.status?.confirmed || activity.status?.failed;
  const queryable = !!activity.hash?.startsWith('th_');
  const { status: fetched } = useTransactionStatus(activity.hash, {
    enabled: account === activity.account && queryable && !terminal,
  });
  const status = terminal ? activity.status : fetched || activity.status;
  const lastSaved = useRef<TransactionStatus | null>(null);
  useEffect(() => {
    if (account !== activity.account || !activity.hash || !fetched || terminal
      || sameActivityStatus(activity.status, fetched)
      || sameActivityStatus(lastSaved.current, fetched)) return;
    lastSaved.current = fetched;
    onStatus(account, activity.hash, fetched);
  }, [account, activity.account, activity.hash, activity.status, fetched, terminal, onStatus]);
  const statusKey = activityStatus(status);
  const Icon = icons[activity.type];
  let StatusIcon = Clock3;
  if (statusKey === 'confirmed') StatusIcon = Check;
  if (statusKey === 'failed') StatusIcon = X;
  const validTime = Number.isFinite(activity.timestamp) && Math.abs(activity.timestamp) < 8.64e15;
  const date = validTime ? new Date(activity.timestamp) : null;
  const relative = new Intl.RelativeTimeFormat(i18n.language, { style: 'short' });
  const minutes = Math.max(0, Math.floor((now - activity.timestamp) / 60000));
  let time = date?.toLocaleDateString(i18n.language) || '—';
  if (minutes < 1) time = t('recent.justNow');
  else if (minutes < 60) time = relative.format(-minutes, 'minute');
  else if (minutes < 1440) time = relative.format(-Math.floor(minutes / 60), 'hour');
  else if (minutes < 10080) time = relative.format(-Math.floor(minutes / 1440), 'day');
  const isSwap = activity.type === 'swap';
  const isDeposit = activity.type === 'add_liquidity';
  const isWithdrawal = activity.type === 'remove_liquidity';
  const format = (amount?: string) => activityAmount(amount, i18n.language);
  const explorer = queryable && CONFIG.EXPLORER_URL
    ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${encodeURIComponent(activity.hash!)}` : null;
  const copy = async () => {
    if (activity.hash) setCopied(await copyToClipboard(activity.hash));
  };
  return (
    <article className={`recent-item ${expanded ? 'is-open' : ''}`}>
      <button type="button" className="recent-row" aria-expanded={expanded} aria-controls={expanded ? id : undefined} onClick={onToggle}>
        <span className="recent-type-icon"><Icon aria-hidden="true" /></span>
        <span className="recent-main">
          <span className="recent-label">
            <b>{t(`recent.${typeKeys[activity.type]}`)}</b>
            <span aria-hidden="true">·</span>
            <time dateTime={date?.toISOString()}>{time}</time>
          </span>
          <span className="recent-flow" dir="ltr">
            <strong title={activity.amountIn}>
              {isSwap && activity.amountIn ? '≈ ' : ''}
              {format(activity.amountIn)}
              {' '}
              {isWithdrawal ? t('recent.lpTokens') : <ActivityToken value={activity.tokenIn} />}
            </strong>
            {isWithdrawal ? (
              <span className="recent-pair">
                <ActivityToken value={activity.tokenIn} />
                {' / '}
                <ActivityToken value={activity.tokenOut} />
              </span>
            ) : activity.tokenOut && (
              <>
                {isDeposit ? <span className="recent-join">+</span> : <ArrowRight aria-hidden="true" />}
                <strong title={activity.amountOut}>
                  {isSwap && activity.amountOut ? '≈ ' : ''}
                  {format(activity.amountOut)}
                  {' '}
                  <ActivityToken value={activity.tokenOut} />
                </strong>
              </>
            )}
          </span>
        </span>
        <span className={`recent-status status-${statusKey}`}>
          <StatusIcon aria-hidden="true" />
          {t(`recent.${statusKey}`)}
        </span>
        <ChevronDown className="recent-chevron" aria-hidden="true" />
      </button>
      {expanded && (
        <div id={id} className="recent-details">
          <dl>
            <div>
              <dt>{t('recent.submitted')}</dt>
              <dd>{date ? `${date.toLocaleString(i18n.language, { timeZone: 'UTC' })} UTC` : '—'}</dd>
            </div>
            {status?.blockNumber != null && status.blockNumber > 0 && (
              <div>
                <dt>{t('recent.block')}</dt>
                <dd>
                  <bdi>{`#${status.blockNumber.toLocaleString(i18n.language)}`}</bdi>
                  {status.confirmations != null && status.confirmations > 0 && (
                    <span>{t('recent.confirmationCount', { count: status.confirmations })}</span>
                  )}
                </dd>
              </div>
            )}
            {activity.hash && (
              <div>
                <dt>{t('recent.transaction')}</dt>
                <dd className="recent-hash">
                  <code dir="ltr">{activity.hash}</code>
                  <button type="button" className="recent-icon" aria-label={t('recent.copy')} onClick={copy}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button>
                </dd>
              </div>
            )}
          </dl>
          {isSwap && <p className="recent-note">{t('recent.quoteNote')}</p>}
          {isDeposit && <p className="recent-note">{t('recent.depositNote')}</p>}
          {statusKey !== 'confirmed' && <p className="recent-note">{t(`recent.${statusKey}Note`)}</p>}
          {copied !== null && <p className="recent-note" role="status">{t(copied ? 'recent.copied' : 'recent.copyFailed')}</p>}
          {explorer && (
          <a className="recent-explorer" href={explorer} target="_blank" rel="noopener noreferrer">
            {t('recent.viewTransaction')}
            <ArrowUpRight aria-hidden="true" />
          </a>
          )}
        </div>
      )}
    </article>
  );
};

const ActivityList = ({ account, recent }: { account?: string; recent?: Activity[] }) => {
  const { t } = useTranslation('dex');
  const heading = useId();
  const {
    getActivitiesForAccount, updateActivityStatus, clearActivitiesForAccount,
  } = useRecentActivities();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const activities = account ? (recent || getActivitiesForAccount(account))
    .filter((item) => item.account === account)
    .slice().sort((a, b) => b.timestamp - a.timestamp) : [];
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (confirm) cancelRef.current?.focus(); }, [confirm]);
  const closeConfirm = () => { setConfirm(false); menuRef.current?.focus(); };
  const clear = () => {
    if (!account) return;
    clearActivitiesForAccount(account);
    setConfirm(false); setExpanded(null); setAll(false);
  };
  return (
    <section className="recent-activity" aria-labelledby={heading}>
      <header className="recent-header">
        <div>
          <h2 id={heading}>
            <History aria-hidden="true" />
            {t('recent.title')}
            {activities.length > 0 && <span>{activities.length}</span>}
          </h2>
          <p>{t(account ? 'recent.scope' : 'recent.disconnectedSubtitle')}</p>
        </div>
        {activities.length > 0 && !recent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" ref={menuRef} className="recent-icon" aria-label={t('recent.options')}><MoreHorizontal aria-hidden="true" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="recent-activity-menu"
              onCloseAutoFocus={(event) => {
                if (confirm) { event.preventDefault(); cancelRef.current?.focus(); }
              }}
            >
              <DropdownMenuItem onSelect={() => setConfirm(true)}>
                <Trash2 aria-hidden="true" />
                {t('recent.clearLocal')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      {activities.length > 0 ? (
        <>
          <div className="recent-rows">
            {activities.slice(0, all ? activities.length : 3).map((activity) => {
              const key = activityKey(activity);
              return (
                <ActivityRow
                  key={key}
                  activity={activity}
                  expanded={expanded === key}
                  onToggle={() => setExpanded(expanded === key ? null : key)}
                  account={account!}
                  onStatus={updateActivityStatus}
                  now={now}
                />
              );
            })}
          </div>
          <footer className="recent-footer">
            <span>{t('recent.saved')}</span>
            {activities.length > 3 && (
              <button type="button" onClick={() => { setAll(!all); setExpanded(null); }}>
                {all ? t('recent.less') : t('recent.viewAll', { count: activities.length })}
                {all ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
              </button>
            )}
          </footer>
        </>
      ) : (
        <div className="recent-empty">
          <span>{account ? <History aria-hidden="true" /> : <Wallet aria-hidden="true" />}</span>
          <div>
            <h3>{t(account ? 'recent.emptyTitle' : 'recent.disconnectedTitle')}</h3>
            <p>{t(account ? 'recent.emptyHint' : 'recent.disconnectedHint')}</p>
          </div>
        </div>
      )}
      {confirm && (
        <div className="recent-confirm" role="region" aria-label={t('recent.clearLocal')}>
          <h3>{t('recent.clearTitle')}</h3>
          <p>{t('recent.clearHint')}</p>
          <div>
            <button type="button" ref={cancelRef} onClick={closeConfirm}>{t('recent.cancel')}</button>
            <button type="button" onClick={clear}>{t('recent.clear')}</button>
          </div>
        </div>
      )}
    </section>
  );
};

const RecentActivity = ({ recent }: { recent?: Activity[] }) => {
  const { activeAccount } = useAccount();
  // Remount disclosures, confirmation and polling when the wallet changes.
  return <ActivityList key={activeAccount || 'disconnected'} account={activeAccount} recent={recent} />;
};
export default RecentActivity;
