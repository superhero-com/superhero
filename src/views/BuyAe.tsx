/* eslint-disable
  react/function-component-definition,
  no-use-before-define
*/
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
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
    actionKey: 'xEarnAction',
    to: '/trends/invite',
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
  // Changelly, Swapzone and SwapSpace were listed here and no longer complete
  // an AE purchase, so they sent people down a dead end. Gate.io is the only
  // external route currently confirmed working. If one of them is fixed, add it
  // back with its locale keys, which are still in place.
];

const EARN_METHODS = METHOD_DEFS.filter((method) => method.section === 'earn');
const BUY_METHODS = METHOD_DEFS.filter((method) => method.section === 'buy');

export default function BuyAe() {
  const { t } = useTranslation('buyAe');

  return (
    <div className="ui-page get-ae-page max-w-[1100px] mx-auto p-4 md:p-6 text-white">
      <Head
        title={t('pageTitle')}
        description={t('pageDescription')}
        canonicalPath="/get-ae"
      />

      <div className="ui-hero mb-5">
        <div className="flex flex-col">
          <div className="max-w-2xl">
            <div className="text-sm opacity-90">{t('eyebrow')}</div>
            <div className="ui-page-title mt-2">{t('heroTitle')}</div>
            <div className="text-[15px] opacity-90 mt-2 leading-relaxed">
              {t('heroDescription')}
            </div>
          </div>

        </div>
        <div className="flex gap-2.5 mt-5 flex-wrap">
          <Badge label={t('badgeBuy')} />
          <Badge label={t('badgeBridge')} />
          <Badge label={t('badgeEarn')} />
        </div>
      </div>

      <div>

        <div className="grid gap-4">

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
              <ShieldCheck className="w-5 h-5 text-blue-300" />
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

const Card = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <section
    id={id}
    className="ui-panel p-5"
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
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-300/10 border border-blue-300/20">
            <Icon className="w-5 h-5 text-blue-300" />
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
    <Icon className="w-4 h-4 text-blue-300" />
  </div>
);

const MethodCard = ({ method }: { method: MethodDef }) => {
  const { t } = useTranslation('buyAe');
  const action = method.actionKey ? t(method.actionKey) : undefined;

  return (
    <div className="h-full border border-white/10 rounded-xl bg-white/[0.02] p-4 transition-colors hover:border-blue-300/35">
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
    'font-semibold no-underline transition-colors gap-1.5 no-underline text-center',
    method.disabled
      ? 'bg-white/10 text-white/45 cursor-not-allowed'
      : 'ui-secondary py-2.5 px-3 text-xs font-semibold cursor-pointer',
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
