import React from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  Activity, ArrowRight, ArrowUpRight, Bot, Check, Code2, Globe2, Hash, Link2,
  MessageCircle, ShieldCheck, Smartphone, TrendingUp, Users, Vote, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import shield from '../../svg/favicon.svg';
import LanguageCollectionLinks from './LanguageCollectionLinks';
import './HeroFeatureCards.css';

const AGENT_URL = 'https://github.com/superhero-com/superhero-agent-skill';

const FeatureScene = ({
  children, note, caption, icon: Icon, kind, amount,
}: {
  children: React.ReactNode;
  note: string;
  caption: string;
  icon: LucideIcon;
  kind: string;
  amount?: React.ReactNode;
}) => (
  <div className={`hero-feature-scene hero-feature-scene--${kind}`}>
    <div className="hero-scene-shadow" aria-hidden="true" />
    <div className="hero-scene-backplate" aria-hidden="true" />
    {children}
    <div className="hero-feature-note">
      <span className="hero-note-icon"><Icon aria-hidden="true" /></span>
      <div>
        <strong>{note}</strong>
        <span>{caption}</span>
      </div>
      {amount}
    </div>
  </div>
);

const ExampleLabel = () => {
  const { t } = useTranslation('banners');
  return <span className="hero-feature-status">{t('cards.example')}</span>;
};

const SignalChart = () => {
  const id = React.useId();
  return (
    <svg className="hero-feature-chart" viewBox="0 0 290 66" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#397fff" stopOpacity=".26" />
          <stop offset="1" stopColor="#397fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`}>
          <stop stopColor="#528dff" />
          <stop offset="1" stopColor="#7bccff" />
        </linearGradient>
      </defs>
      <path className="hero-chart-guide" d="M0 17H290M0 42H290" />
      <path d="M0 57C17 59 23 50 36 52S59 52 73 41S92 39 106 30S129 28 141 23S164 26 176 31S198 26 210 18S232 18 244 7S267 15 279 6L290 7V66H0Z" fill={`url(#${id}-fill)`} />
      <path d="M0 57C17 59 23 50 36 52S59 52 73 41S92 39 106 30S129 28 141 23S164 26 176 31S198 26 210 18S232 18 244 7S267 15 279 6L290 7" fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2" />
      <circle cx="279" cy="6" r="3" fill="#9bd5ff" />
    </svg>
  );
};

export const TrendFeatureCard = () => {
  const { t } = useTranslation('banners');
  return (
    <FeatureScene kind="trend" icon={Hash} note={t('cards.everyHashtag')} caption={t('cards.createDiscoverTrade')}>
      <div className="hero-feature-card">
        <header>
          <span className="hero-feature-icon"><Hash aria-hidden="true" /></span>
          <div>
            <strong><bdi>#Solar</bdi></strong>
            <small>{t('cards.tokenizedSignal')}</small>
          </div>
          <ExampleLabel />
        </header>
        <div className="hero-feature-quote">
          <strong><bdi>$1.24</bdi></strong>
          <span>
            <bdi>+8.2%</bdi>
            <TrendingUp aria-hidden="true" />
          </span>
        </div>
        <SignalChart />
        <footer>
          <span>
            <TrendingUp aria-hidden="true" />
            {t('cards.bondingCurve')}
          </span>
          <Link to="/trends/tokens">
            {t('cards.explore')}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </FeatureScene>
  );
};

export const PostFeatureCard = () => {
  const { t } = useTranslation('banners');
  return (
    <FeatureScene
      kind="post"
      icon={Check}
      note={t('cards.valueToCreator')}
      caption={t('cards.directTips')}
      amount={(
        <bdi className="hero-receipt-amount">
          +5
          <small>AE</small>
        </bdi>
)}
    >
      <div className="hero-feature-card hero-feature-card--post">
        <header>
          <span className="hero-feature-icon hero-feature-icon--brand"><img src={shield} alt="" /></span>
          <div>
            <strong><bdi>@superhero</bdi></strong>
            <small>{t('cards.postedOnChain')}</small>
          </div>
          <ExampleLabel />
        </header>
        <p><Trans ns="banners" i18nKey="cards.postText" components={{ tag: <span /> }} /></p>
        <div className="hero-post-bottom">
          <span className="hero-tip-demo">
            <img src={shield} alt="" />
            {t('cards.tip', { amount: 5 })}
          </span>
          <span>
            <ShieldCheck aria-hidden="true" />
            {t('cards.onChainReceipt')}
          </span>
        </div>
      </div>
    </FeatureScene>
  );
};

export const CommunityFeatureCard = () => {
  const { t } = useTranslation('banners');
  return (
    <FeatureScene kind="dao" icon={Vote} note={t('cards.yourCommunity')} caption={t('cards.holdersShape')}>
      <div className="hero-feature-card hero-feature-card--dao">
        <header>
          <span className="hero-feature-icon"><Users aria-hidden="true" /></span>
          <div>
            <strong>{t('cards.purposeDao')}</strong>
            <small>{t('cards.communityTreasury')}</small>
          </div>
          <ExampleLabel />
        </header>
        <div className="hero-feature-quote">
          <strong><bdi>$128.4k</bdi></strong>
          <span>
            <bdi>+37.8%</bdi>
            <TrendingUp aria-hidden="true" />
          </span>
        </div>
        <div className="hero-treasury-flow">
          <span>
            <Activity aria-hidden="true" />
            {t('cards.marketFees')}
          </span>
          <ArrowRight aria-hidden="true" />
          <span>
            <Wallet aria-hidden="true" />
            {t('cards.treasury')}
          </span>
        </div>
        <div className="hero-treasury-payout">
          <span>{t('cards.creatorPayouts')}</span>
          <strong><bdi>$12.3k</bdi></strong>
        </div>
        <footer>
          <span>
            <Users aria-hidden="true" />
            {t('cards.communityDao')}
          </span>
          <Link to="/trends/daos">
            {t('bannerC.secondaryButton')}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </FeatureScene>
  );
};

export const AgentFeatureCard = () => {
  const { t } = useTranslation('banners');
  const tasks = [
    { icon: MessageCircle, title: 'agentPost', caption: 'agentPostCaption' },
    { icon: TrendingUp, title: 'agentTrade', caption: 'agentTradeCaption' },
    { icon: Users, title: 'agentGrow', caption: 'agentGrowCaption' },
  ];
  return (
    <FeatureScene kind="agent" icon={Link2} note={t('cards.connectedToSuperhero')} caption={t('cards.agentActions')}>
      <div className="hero-feature-card hero-feature-card--agent">
        <header>
          <span className="hero-feature-icon"><Bot aria-hidden="true" /></span>
          <div>
            <strong>{t('cards.aiWorkspace')}</strong>
            <small>Openclaw / Claude</small>
          </div>
          <ExampleLabel />
        </header>
        <div className="hero-agent-workflow">
          {tasks.map(({ icon: Icon, title, caption }) => (
            <div key={title}>
              <span><Icon aria-hidden="true" /></span>
              <div>
                <strong>{t(`cards.${title}`)}</strong>
                <small>{t(`cards.${caption}`)}</small>
              </div>
              <Check aria-hidden="true" />
            </div>
          ))}
        </div>
        <footer>
          <span>
            <Code2 aria-hidden="true" />
            {t('cards.fullApi')}
          </span>
          <a href={AGENT_URL} target="_blank" rel="noopener noreferrer">
            {t('cards.connectAgent')}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </footer>
      </div>
    </FeatureScene>
  );
};

export const LanguageFeatureCard = () => {
  const { t } = useTranslation('banners');
  return (
    <FeatureScene kind="languages" icon={Globe2} note={t('cards.oneNetwork')} caption={t('cards.nativeCommunities')}>
      <div className="hero-feature-card hero-feature-card--languages">
        <header>
          <span className="hero-feature-icon"><Globe2 aria-hidden="true" /></span>
          <div>
            <strong>{t('cards.findCommunity')}</strong>
            <small>{t('cards.exploreLanguage')}</small>
          </div>
        </header>
        <LanguageCollectionLinks />
        <footer>
          <span>
            <Globe2 aria-hidden="true" />
            {t('cards.fourLanguages')}
          </span>
        </footer>
      </div>
    </FeatureScene>
  );
};

export const AppFeatureCard = () => {
  const { t } = useTranslation('banners');
  const platforms = [
    {
      icon: Smartphone, title: 'iOS', subtitle: 'App Store', href: 'https://apps.apple.com/us/app/superhero-web3-communities/id6758045846',
    },
    {
      icon: Smartphone, title: 'Android', subtitle: 'Google Play', href: 'https://play.google.com/store/apps/details?id=com.superhero.apps',
    },
    {
      icon: Bot, title: t('cards.aiAgents'), subtitle: 'Openclaw / Claude', href: AGENT_URL,
    },
  ];
  return (
    <FeatureScene kind="app" icon={Wallet} note={t('cards.yourWallet')} caption={t('cards.tradePostConnect')}>
      <div className="hero-feature-card hero-feature-card--app">
        <header>
          <span className="hero-feature-icon hero-feature-icon--brand"><img src={shield} alt="" /></span>
          <div>
            <strong>Superhero</strong>
            <small>{t('cards.nowAvailable')}</small>
          </div>
          <span className="hero-feature-status">{t('cards.getApp')}</span>
        </header>
        <nav className="hero-platform-cards" aria-label={t('cards.platforms')}>
          {platforms.map(({
            icon: Icon, title, subtitle, href,
          }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${title} · ${subtitle}`}>
              <span className="hero-platform-icon"><Icon aria-hidden="true" /></span>
              <span>
                <strong>{title}</strong>
                <small>{subtitle}</small>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>
    </FeatureScene>
  );
};
