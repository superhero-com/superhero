/* eslint-disable
  react/function-component-definition,
  no-use-before-define
*/
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Handshake,
  Landmark,
  type LucideIcon,
} from 'lucide-react';
import { Head } from '../seo/Head';

type MethodIcon = LucideIcon | typeof IconX;

type MethodDef = {
  id: string;
  Icon: MethodIcon;
  titleKey: string;
  descriptionKey: string;
  actionKey?: string;
  href?: string;
  to?: string;
  disabled?: boolean;
};

function IconX({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

const METHOD_DEFS: MethodDef[] = [
  {
    id: 'gate',
    Icon: Landmark,
    titleKey: 'gateTitle',
    descriptionKey: 'gateDescription',
    actionKey: 'gateAction',
    href: 'https://www.gate.io/trade/AE_USDT',
  },
  {
    id: 'Changelly',
    Icon: ArrowLeftRight,
    titleKey: 'changellyTitle',
    descriptionKey: 'changellyDescription',
    actionKey: 'changellyAction',
    href: 'https://changelly.com/',
  },
  {
    id: 'swapzone',
    Icon: ArrowLeftRight,
    titleKey: 'swapzoneTitle',
    descriptionKey: 'swapzoneDescription',
    actionKey: 'swapzoneAction',
    href: 'https://swapzone.io/exchange/eth/ae',
  },
  {
    id: 'swapspace',
    Icon: ArrowLeftRight,
    titleKey: 'swapspaceTitle',
    descriptionKey: 'swapspaceDescription',
    actionKey: 'swapspaceAction',
    href: 'https://swapspace.co/?direction=direct&from=eth&fromNetwork=ETH&to=ae&toNetwork=AE',
  },
  {
    id: 'refer',
    Icon: Handshake,
    titleKey: 'referTitle',
    descriptionKey: 'referDescription',
    actionKey: 'referAction',
    to: '/trends/invite',
  },
  {
    id: 'x-earn',
    Icon: IconX,
    titleKey: 'xEarnTitle',
    descriptionKey: 'xEarnDescription',
    actionKey: 'comingSoon',
    disabled: true,
  },
];

export default function BuyAe() {
  const { t } = useTranslation('buyAe');

  return (
    <div className="max-w-[1000px] mx-auto p-6 text-white">
      <Head
        title={t('pageTitle')}
        description={t('pageDescription')}
        canonicalPath="/get-ae"
      />

      <div className="rounded-2xl p-7 bg-gradient-to-b from-white/6 to-white/3 text-white mb-4 border border-white/10 backdrop-blur-md">
        <div className="text-sm opacity-90">{t('eyebrow')}</div>
        <div className="text-[32px] font-extrabold leading-tight">{t('heroTitle')}</div>
        <div className="text-[15px] opacity-90 mt-2">{t('heroDescription')}</div>
        <div className="flex gap-2.5 mt-3.5 flex-wrap">
          <Badge label={t('badgeBuy')} />
          <Badge label={t('badgeBridge')} />
          <Badge label={t('badgeEarn')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <div className="font-extrabold mb-2">{t('onThisPage')}</div>
          <div className="grid gap-1.5">
            <a href="#what-is-ae" className="no-underline text-white text-sm opacity-90">
              {t('whatIsAeTitle')}
            </a>
            <a href="#ways-to-get-ae" className="no-underline text-white text-sm opacity-90">
              {t('waysTitle')}
            </a>
            <a href="#before-you-buy" className="no-underline text-white text-sm opacity-90">
              {t('safetyTitle')}
            </a>
          </div>
          <div className="mt-4 text-xs opacity-75">{t('tip')}</div>
        </Card>

        <div className="grid gap-4">
          <Card id="what-is-ae">
            <div className="font-extrabold mb-2">{t('whatIsAeTitle')}</div>
            <p className="text-[15px] opacity-90 leading-relaxed m-0">
              {t('whatIsAeDescription')}
            </p>
          </Card>

          <Card id="ways-to-get-ae">
            <div className="font-extrabold mb-2">{t('waysTitle')}</div>
            <div className="grid gap-3">
              {METHOD_DEFS.map((method) => (
                <MethodCard key={method.id} method={method} />
              ))}
            </div>
          </Card>

          <Card id="before-you-buy">
            <div className="font-extrabold mb-2">{t('safetyTitle')}</div>
            <ul className="m-0 pl-4.5 leading-relaxed text-[15px] opacity-90">
              <li>{t('safetyLi1')}</li>
              <li>{t('safetyLi2')}</li>
              <li>{t('safetyLi3')}</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

const Badge = ({ label }: { label: string }) => (
  <span className="px-2.5 py-1.5 rounded-full bg-white/12 border border-white/20 text-xs">
    {label}
  </span>
);

const Card = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <section
    id={id}
    className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
  >
    {children}
  </section>
);

const MethodIconBox = ({ Icon }: { Icon: MethodIcon }) => (
  <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-white/10 border border-white/15">
    <Icon className="w-4 h-4 text-cyan-300" />
  </div>
);

const MethodCard = ({ method }: { method: MethodDef }) => {
  const { t } = useTranslation('buyAe');
  const action = method.actionKey ? t(method.actionKey) : undefined;

  return (
    <div className="border border-white/10 rounded-xl bg-white/5 p-3">
      <div className="flex items-start gap-3">
        <MethodIconBox Icon={method.Icon} />
        <div className="min-w-0 flex-1">
          <div className="font-bold">{t(method.titleKey)}</div>
          <div className="mt-1 text-sm text-white/75 leading-relaxed">
            {t(method.descriptionKey)}
          </div>
          {action && (
            <div className="mt-3">
              <MethodAction method={method} label={action} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MethodAction = ({ method, label }: { method: MethodDef; label: string }) => {
  const className = [
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs',
    'font-semibold no-underline transition-colors',
    method.disabled
      ? 'bg-white/10 text-white/45 cursor-not-allowed'
      : 'bg-white text-black hover:bg-white/85',
  ].join(' ');

  if (method.disabled) {
    return <span className={className}>{label}</span>;
  }

  if (method.to) {
    return (
      <Link to={method.to} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={method.href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
};
