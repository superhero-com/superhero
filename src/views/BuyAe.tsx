/* eslint-disable
  react/function-component-definition,
  no-use-before-define
*/
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ExternalLink,
  Gift,
  Handshake,
  Landmark,
  ShieldCheck,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { Head } from '../seo/Head';

type MethodSection = 'earn' | 'buy';
type MethodIcon = LucideIcon | typeof IconX;

type MethodDef = {
  id: string;
  section: MethodSection;
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
    id: 'refer',
    section: 'earn',
    Icon: Handshake,
    titleKey: 'referTitle',
    descriptionKey: 'referDescription',
    actionKey: 'referAction',
    to: '/trends/invite',
  },
  {
    id: 'x-earn',
    section: 'earn',
    Icon: IconX,
    titleKey: 'xEarnTitle',
    descriptionKey: 'xEarnDescription',
    actionKey: 'comingSoon',
    disabled: true,
  },
  {
    id: 'gate',
    section: 'buy',
    Icon: Landmark,
    titleKey: 'gateTitle',
    descriptionKey: 'gateDescription',
    actionKey: 'gateAction',
    href: 'https://www.gate.io/trade/AE_USDT',
  },
  {
    id: 'Changelly',
    section: 'buy',
    Icon: ArrowLeftRight,
    titleKey: 'changellyTitle',
    descriptionKey: 'changellyDescription',
    actionKey: 'changellyAction',
    href: 'https://changelly.com/',
  },
  {
    id: 'swapzone',
    section: 'buy',
    Icon: ArrowLeftRight,
    titleKey: 'swapzoneTitle',
    descriptionKey: 'swapzoneDescription',
    actionKey: 'swapzoneAction',
    href: 'https://swapzone.io/exchange/eth/ae',
  },
  {
    id: 'swapspace',
    section: 'buy',
    Icon: ArrowLeftRight,
    titleKey: 'swapspaceTitle',
    descriptionKey: 'swapspaceDescription',
    actionKey: 'swapspaceAction',
    href: 'https://swapspace.co/?direction=direct&from=eth&fromNetwork=ETH&to=ae&toNetwork=AE',
  },
];

const EARN_METHODS = METHOD_DEFS.filter((method) => method.section === 'earn');
const BUY_METHODS = METHOD_DEFS.filter((method) => method.section === 'buy');

export default function BuyAe() {
  const { t } = useTranslation('buyAe');

  return (
    <div className="max-w-[1100px] mx-auto p-6 text-white">
      <Head
        title={t('pageTitle')}
        description={t('pageDescription')}
        canonicalPath="/get-ae"
      />

      <div className="overflow-hidden rounded-3xl p-7 bg-gradient-to-br from-cyan-500/20 via-white/8 to-fuchsia-500/15 text-white mb-5 border border-white/10 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-sm opacity-90">{t('eyebrow')}</div>
            <div className="text-[34px] font-extrabold leading-tight">{t('heroTitle')}</div>
            <div className="text-[15px] opacity-90 mt-2 leading-relaxed">
              {t('heroDescription')}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <HeroStat Icon={Gift} label={t('earnSectionTitle')} />
            <HeroStat Icon={Store} label={t('buySectionTitle')} />
          </div>
        </div>
        <div className="flex gap-2.5 mt-5 flex-wrap">
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
            <a href="#earn-ae" className="no-underline text-white text-sm opacity-90">
              {t('earnSectionTitle')}
            </a>
            <a href="#buy-ae" className="no-underline text-white text-sm opacity-90">
              {t('buySectionTitle')}
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

          <MethodSectionCard
            id="earn-ae"
            Icon={Gift}
            title={t('earnSectionTitle')}
            description={t('earnSectionDescription')}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {EARN_METHODS.map((method) => (
                <MethodCard key={method.id} method={method} />
              ))}
            </div>
          </MethodSectionCard>

          <MethodSectionCard
            id="buy-ae"
            Icon={Store}
            title={t('buySectionTitle')}
            description={t('buySectionDescription')}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {BUY_METHODS.map((method) => (
                <MethodCard key={method.id} method={method} />
              ))}
            </div>
          </MethodSectionCard>

          <Card id="before-you-buy">
            <div className="flex items-center gap-2 font-extrabold mb-2">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
              {t('safetyTitle')}
            </div>
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

const HeroStat = ({ Icon, label }: { Icon: LucideIcon; label: string }) => (
  <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/12 mb-3">
      <Icon className="w-5 h-5 text-cyan-300" />
    </div>
    <div className="text-sm font-bold">{label}</div>
  </div>
);

const Card = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <section
    id={id}
    className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
  >
    {children}
  </section>
);

const MethodSectionCard = ({
  id,
  Icon,
  title,
  description,
  children,
}: {
  id: string;
  Icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <Card id={id}>
    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2 font-extrabold text-xl">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-300/15 border border-cyan-300/25">
            <Icon className="w-5 h-5 text-cyan-300" />
          </span>
          {title}
        </div>
        <p className="mt-2 mb-0 text-[15px] text-white/80 leading-relaxed">{description}</p>
      </div>
    </div>
    {children}
  </Card>
);

const MethodIconBox = ({ Icon }: { Icon: MethodIcon }) => (
  <div className="flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-white/10 border border-white/15">
    <Icon className="w-4 h-4 text-cyan-300" />
  </div>
);

const MethodCard = ({ method }: { method: MethodDef }) => {
  const { t } = useTranslation('buyAe');
  const action = method.actionKey ? t(method.actionKey) : undefined;

  return (
    <div className="h-full border border-white/10 rounded-2xl bg-gradient-to-b from-white/8 to-white/4 p-4 transition-transform hover:-translate-y-0.5 hover:border-cyan-300/35">
      <div className="flex items-start gap-3 h-full">
        <MethodIconBox Icon={method.Icon} />
        <div className="min-w-0 flex-1 flex flex-col h-full">
          <div className="font-bold">{t(method.titleKey)}</div>
          <div className="mt-1 text-sm text-white/75 leading-relaxed flex-1">
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
    'font-semibold no-underline transition-colors gap-1.5',
    method.disabled
      ? 'bg-white/10 text-white/45 cursor-not-allowed'
      : 'bg-white text-black hover:bg-white/85',
  ].join(' ');

  if (method.disabled) {
    return <span className={className}>{label}</span>;
  }

  const actionContent = (
    <>
      {label}
      {method.href && <ExternalLink className="w-3.5 h-3.5" />}
    </>
  );

  if (method.to) {
    return (
      <Link to={method.to} className={className}>
        {actionContent}
      </Link>
    );
  }

  return (
    <a href={method.href} target="_blank" rel="noopener noreferrer" className={className}>
      {actionContent}
    </a>
  );
};
