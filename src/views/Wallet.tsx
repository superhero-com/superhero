/* eslint-disable
  react/function-component-definition,
  react/no-unescaped-entities,
  max-len
*/
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, Smartphone, ArrowRight, ChevronDown, Sparkles, Globe,
  Layers, Link2, Download, HelpCircle, ChevronUp, Wallet as WalletIcon, Monitor,
  KeyRound, Users, Fingerprint, BookUser, QrCode,
} from 'lucide-react';
import { trustedHtml } from '../utils/trustedTypes';

/* ------------------------------------------------------------------ */
/*  Floating orb component for ambient background                     */
/* ------------------------------------------------------------------ */
function FloatingOrb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] opacity-20 pointer-events-none ${className ?? ''}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Interactive 3D Hero Visual Mockup                                 */
/* ------------------------------------------------------------------ */
function InteractiveHeroVisual() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<'ae' | 'eth' | 'btc'>('ae');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateX = -(y - yc) / (yc / 15);
    const rotateY = (x - xc) / (xc / 15);
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[320px] aspect-[10/12] mx-auto lg:mx-0 rounded-[28px] border border-white/[0.08] bg-white/[0.02] backdrop-blur-3xl p-4 transition-all duration-300 ease-out cursor-pointer hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="absolute w-[200px] h-[200px] rounded-full bg-blue-500/20 blur-[60px] pointer-events-none transition-all duration-500 ease-out -z-10"
        style={{
          transform: `translate3d(${tilt.y * 3}px, ${-tilt.x * 3}px, -20px)`,
        }}
      />

      <div className="h-full flex flex-col justify-between relative z-10" style={{ transform: 'translateZ(30px)' }}>
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/50">{t('common.views.wallet.mock.superheroWallet')}</span>
          </div>

        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-0.5 font-mono">{t('common.views.wallet.mock.currentBalance')}</p>
                <h3 className="text-3xl font-extrabold text-white/95 leading-none tracking-tight">$1,248.50</h3>
                <p className="text-[11px] text-green-400/80 font-mono mt-1 font-semibold flex items-center gap-1">
                  <span>▲</span>
                  {' '}
                  +2.84%
                  {' '}
                  <span className="text-white/30 font-normal">(24h)</span>
                </p>
              </div>
              <div className="p-2 border border-white/[0.08] bg-white/[0.04] rounded-xl flex items-center justify-center">
                <QrCode className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <div className="h-20 w-full mb-6 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 50 Q 15 25, 30 35 T 60 15 T 85 25 T 100 5 L 100 50 L 0 50 Z"
                  fill="url(#chartGlow)"
                />
                <path
                  d="M0 50 Q 15 25, 30 35 T 60 15 T 85 25 T 100 5"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="5" r="2.5" fill="#ffffff" />
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-1 px-1 py-1 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
              {(['ae', 'eth', 'btc'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`py-1 text-[11px] font-medium tracking-wide uppercase font-mono rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/20 shadow'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 min-h-[72px] flex items-center transition-all duration-300">
              {activeTab === 'ae' && (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400 font-mono text-[12px]">
                      Æ
                    </div>
                    <div>
                      <h4 className="text-[12px] font-semibold text-white/90 font-mono leading-none mb-1">æternity</h4>
                      <p className="text-[10px] text-white/40 font-mono leading-none">ak_super...42ae</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold font-mono text-white/90">24,500.00 AE</p>
                    <p className="text-[10px] text-white/40 font-mono font-semibold">$2,450.00</p>
                  </div>
                </div>
              )}
              {activeTab === 'eth' && (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 font-mono text-[12px]">
                      Ξ
                    </div>
                    <div>
                      <h4 className="text-[12px] font-semibold text-white/90 font-mono leading-none mb-1">Ethereum</h4>
                      <p className="text-[10px] text-white/40 font-mono leading-none">0x71C...a7E</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold font-mono text-white/90">1.45 ETH</p>
                    <p className="text-[10px] text-white/40 font-mono font-semibold">$4,785.00</p>
                  </div>
                </div>
              )}
              {activeTab === 'btc' && (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-400 font-mono text-[11px]">
                      ₿
                    </div>
                    <div>
                      <h4 className="text-[12px] font-semibold text-white/90 font-mono leading-none mb-1">Bitcoin</h4>
                      <p className="text-[10px] text-white/40 font-mono leading-none">bc1q...x89</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold font-mono text-white/90">0.052 BTC</p>
                    <p className="text-[10px] text-white/40 font-mono font-semibold">$3,484.00</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Crypto & Token management interactive Widget                      */
/* ------------------------------------------------------------------ */
function CryptoManagementWidget() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('120.00');
  const [address, setRecipient] = useState('super-dev.chain');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const handleSend = () => {
    setStatus('sending');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 4000);
    }, 1500);
  };

  return (
    <div className="space-y-2 select-none text-left">
      <div className="flex justify-between items-center text-[10px] text-white/40">
        <span>{t('common.views.wallet.mock.availableBalance', { amount: '24,500.00 AE' })}</span>
        <span className="text-blue-400">{t('common.views.wallet.mock.tokens')}</span>
      </div>
      <div>
        <span className="block text-[9px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t('common.views.wallet.mock.amountToSend')}</span>
        <div className="relative flex items-center">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] lg:border-white/[0.12] rounded-lg py-1.5 pl-3 pr-12 text-[11px] text-white/80 outline-none focus:border-blue-500/30"
          />
          <span className="absolute right-3 text-white/40 text-[10px] font-bold">AE</span>
        </div>
      </div>
      <div>
        <span className="block text-[9px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t('common.views.wallet.mock.recipientIdentity')}</span>
        <input
          type="text"
          value={address}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.08] lg:border-white/[0.12] rounded-lg py-1.5 px-3 text-[11px] text-white/80 outline-none focus:border-blue-500/30"
        />
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={status !== 'idle'}
        className="w-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/20 hover:from-blue-500/30 hover:to-indigo-500/30 hover:border-blue-400/40 text-blue-300 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {status === 'idle' && (
          <>
            <WalletIcon className="w-3.5 h-3.5" />
            <span>{t('common.views.wallet.mock.sendAssets')}</span>
          </>
        )}
        {status === 'sending' && (
          <>
            <div className="w-3.5 h-3.5 rounded-full border border-dashed border-blue-400 animate-spin" />
            <span>{t('common.views.wallet.mock.broadcasting')}</span>
          </>
        )}
        {status === 'success' && (
          <span>{t('common.views.wallet.mock.confirmed', { txHash: 'ak_tx...e4' })}</span>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Multisig Vault dashboard interactive Widget                       */
/* ------------------------------------------------------------------ */
function MultisigWidget() {
  const { t } = useTranslation();
  const [complete, setComplete] = useState(false);

  return (
    <div className="space-y-2 select-none text-left">
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-white/40">{t('common.views.wallet.mock.vault', { address: 'ak_msig...82f' })}</span>
        <span className={complete ? 'text-green-400' : 'text-amber-400 animate-pulse font-semibold'}>
          {complete ? t('common.views.wallet.mock.executed') : t('common.views.wallet.mock.awaitingSignature')}
        </span>
      </div>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/50">{t('common.views.wallet.mock.transferRequest')}</span>
          <span className="text-white/90 font-bold font-mono">5,000.00 AE</span>
        </div>
        <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-400 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: complete ? '100%' : '66.6%' }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-white/40">
          <span>{t('common.views.wallet.mock.threshold', { required: 2, total: 3 })}</span>
          <span>
            {t('common.views.wallet.mock.signedCount', { signed: complete ? 3 : 2, total: 3 })}
          </span>
        </div>
      </div>
      <div className="space-y-1 font-mono text-[9px]">
        <div className="flex items-center justify-between text-green-400">
          <span>ak_rMh...72a (Admin)</span>
          <span>{t('common.views.wallet.mock.signedCheck')}</span>
        </div>
        <div className="flex items-center justify-between text-green-400">
          <span>ak_pLd...44k (Finance)</span>
          <span>{t('common.views.wallet.mock.signedCheck')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/40">ak_tQx...10e (Backup)</span>
          {complete ? (
            <span className="text-green-400 font-bold">{t('common.views.wallet.mock.signedCheck')}</span>
          ) : (
            <span className="text-amber-400 font-bold">{t('common.views.wallet.mock.pending')}</span>
          )}
        </div>
      </div>
      {!complete && (
        <button
          type="button"
          onClick={() => setComplete(true)}
          className="w-full text-center text-[10px] uppercase tracking-wider py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-500/20 transition-all font-bold"
        >
          {t('common.views.wallet.mock.signAsBackupKey')}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Address Book filterable search Widget                             */
/* ------------------------------------------------------------------ */
function AddressBookWidget() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const contacts = [
    {
      name: 'Alice Smith',
      domain: 'alice.chain',
      address: 'ak_r276...dfE3',
      label: '01',
    },
    {
      name: 'Bob James',
      domain: 'bob.chain',
      address: 'ak_m941...23p',
      label: '02',
    },
    {
      name: 'Dev Wallet',
      domain: 'development.chain',
      address: 'ak_tQ2b...86k',
      label: '03',
    },
    {
      name: 'Charlie Creator',
      domain: 'charlie.chain',
      address: 'ak_zW45...99n',
      label: '04',
    },
  ];

  const filtered = contacts.filter((c) => (
    c.name.toLowerCase().includes(query.toLowerCase())
    || c.domain.toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <div className="space-y-3 select-none text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{t('common.views.wallet.mock.addressDirectory')}</span>
        <div className="relative max-w-[200px] w-full">
          <input
            type="text"
            placeholder={t('common.views.wallet.mock.searchContacts')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md py-1 px-2.5 text-[10px] text-white/80 placeholder-white/20 outline-none focus:border-blue-500/20"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
        {filtered.length > 0 ? (
          filtered.map((contact) => (
            <div key={contact.address} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 flex items-center justify-between hover:bg-white/[0.04] transition-all">
              <div>
                <h4 className="text-[11px] font-bold text-white/85 leading-none mb-0.5">{contact.name}</h4>
                <p className="text-[9px] text-blue-400 font-medium leading-none mb-1 font-mono">{contact.domain}</p>
                <span className="text-[8px] text-white/20 font-mono">{contact.address}</span>
              </div>
              <span className="text-[8px] bg-white/[0.04] px-1.5 py-0.5 rounded text-white/50 border border-white/[0.06] shrink-0 self-start">
                {contact.label}
              </span>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-4 text-white/30 text-[10px]">
            {t('common.views.wallet.mock.noContactsMatch')}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Item — glass morphism                                         */
/* ------------------------------------------------------------------ */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg overflow-hidden transition-all duration-200 hover:border-blue-400/20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
      >
        <span className="text-[14px] font-medium text-white/75">{question}</span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-blue-400/60 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p
            className="text-[13px] text-white/50 leading-relaxed whitespace-pre-line"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: trustedHtml(answer.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/70">$1</strong>')) }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Category — top-level expandable group                         */
/* ------------------------------------------------------------------ */
function FaqCategory({
  index,
  title,
  items,
  defaultOpen = false,
}: {
  index: number;
  title: string;
  items: { question: string; answer: string }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.04]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[11px] font-mono font-semibold text-blue-400/80 tabular-nums shrink-0">
            {String(index).padStart(2, '0')}
          </span>
          <span className="text-[16px] font-semibold text-white/90 truncate">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-blue-400/60 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 sm:px-6 pb-5 pt-1 space-y-2">
          {items.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      )}
    </div>
  );
}

const FAQ_CATEGORIES: { key: string; items: string[] }[] = [
  {
    key: 'gettingStarted',
    items: ['whatIsSuperheroWallet', 'downloadAndInstall', 'supportedPlatforms', 'setUpNewWallet', 'importExistingWallet', 'backUpWallet'],
  },
  {
    key: 'overview',
    items: ['dashboardDisplay', 'totalBalanceFiat', 'switchAccounts', 'multisigVaults', 'sendReceiveFunds'],
  },
  {
    key: 'accountManagement',
    items: ['accountDetails', 'assetsTab', 'transactionHistory', 'aens', 'shareAddress'],
  },
  {
    key: 'security',
    items: ['nonCustodial', 'privateKeysManaged', 'forgotSeedPhrase', 'airgapSetup', 'seedPhraseBackup'],
  },
  {
    key: 'dapps',
    items: ['supportedDapps', 'walletConnect', 'inAppBrowser'],
  },
  {
    key: 'giftCards',
    items: ['createSendGiftCard', 'customizeGiftCards'],
  },
  {
    key: 'troubleshooting',
    items: ['forgotPassword', 'resetWallet', 'delayedTransaction', 'dappConnection', 'walletNotSyncing'],
  },
  {
    key: 'advanced',
    items: ['switchNetworks', 'manageMultipleAccounts', 'exportAddressBook', 'customizeSettings'],
  },
  {
    key: 'support',
    items: ['githubRepository', 'reportBugs', 'contactSupport'],
  },
];

/* ------------------------------------------------------------------ */
/*  Main Wallet Page                                                  */
/* ------------------------------------------------------------------ */
export default function Wallet() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#06060b] text-white overflow-x-hidden selection:bg-blue-500/30">

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative min-h-[95vh] lg:min-h-screen flex items-center py-20 lg:py-0 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <FloatingOrb className="w-[600px] h-[600px] bg-blue-600 -top-40 -left-40" />
          <FloatingOrb className="w-[500px] h-[500px] bg-indigo-600 top-1/3 -right-32" />
          <FloatingOrb className="w-[400px] h-[400px] bg-cyan-600 bottom-0 left-1/3" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#06060b_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Title & CTAs */}
            <div className="lg:col-span-7 text-center lg:text-left flex flex-col items-center lg:items-start">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] mb-8">
                <WalletIcon className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[12px] font-medium tracking-wide text-white/60 uppercase">
                  {t('common.views.wallet.hero.badge')}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[44px] xl:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6">
                <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent pb-3">
                  {t('common.views.wallet.mock.superheroWallet')}
                </span>
              </h1>

              {/* Sub */}
              <p
                className="max-w-xl text-sm md:text-base lg:text-[15px] xl:text-base text-white/40 leading-relaxed mb-8"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: trustedHtml(t('common.views.wallet.hero.subtitle').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')) }}
              />

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 w-full mb-8 lg:mb-0">
                <a
                  href="https://play.google.com/store/apps/details?id=com.superhero.cordova&pli=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-[13px] px-5 py-3 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 w-full sm:w-auto justify-center"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {t('common.views.landing.mobile.googlePlay')}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
                <a
                  href="https://apps.apple.com/bg/app/superhero-wallet/id1502786641"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-[13px] px-5 py-3 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20 w-full sm:w-auto justify-center"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {t('common.views.landing.mobile.appStore')}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
                <br />
                <a
                  href="https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-white/80 font-semibold text-[13px] px-5 py-3 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-blue-400/20 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {t('common.views.wallet.download.chromeExtension')}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>

            {/* Right Column: Visual Interactive 3D/Parallax Device */}
            <div className="lg:col-span-5 flex justify-center items-center relative z-20">
              <InteractiveHeroVisual />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-12 lg:mt-20">
            <ChevronDown className="w-10 h-10 text-white/20 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 1: 2/3 + 1/3, then 3/3                              */}
      {/* ============================================================ */}
      <section id="features" className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[500px] h-[500px] bg-blue-800 -top-20 -right-40" />
        <div className="max-w-[1180px] mx-auto px-6">
          {/* Section header */}
          <div className="max-w-2xl mb-16 text-left">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              {t('common.views.wallet.features.eyebrow')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              {t('common.views.wallet.features.titleLine1')}
              <br />
              <span className="text-white/40">{t('common.views.wallet.features.titleLine2')}</span>
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              {t('common.views.wallet.features.description')}
            </p>
          </div>

          {/* Row 1: 2/3 + 1/3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Card 1: Multichain support (2/3) */}
            <div className="lg:col-span-2 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-full">
                <div className="md:col-span-7 flex flex-col justify-center text-left">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <Layers className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">01</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.multichain.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed">
                    {t('common.views.wallet.cards.multichain.description')}
                  </p>
                </div>
                <div className="md:col-span-5 bg-black/40 border border-white/[0.04] rounded-xl p-3 space-y-1.5 font-mono select-none text-left w-full">
                  {[
                    {
                      coin: 'AE', name: 'æternity', amount: '15,420.0', usd: '$1,542.0', color: 'bg-purple-500',
                    },
                    {
                      coin: 'ETH', name: 'Ethereum', amount: '1.250', usd: '$4,125.0', color: 'bg-indigo-500',
                    },
                    {
                      coin: 'BTC', name: 'Bitcoin', amount: '0.048', usd: '$3,240.2', color: 'bg-orange-500',
                    },
                    {
                      coin: 'BNB', name: 'BNB Chain', amount: '0.850', usd: '$510.0', color: 'bg-yellow-500',
                    },
                    {
                      coin: 'DOGE', name: 'Dogecoin', amount: '8,400.0', usd: '$1,176.0', color: 'bg-amber-400',
                    },
                  ].map((asset) => (
                    <div key={asset.coin} className="flex items-center justify-between text-[11px] p-1.5 rounded hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${asset.color}`} />
                        <span className="text-white/80 font-bold">{asset.coin}</span>
                        <span className="text-white/30 text-[10px] hidden sm:inline">{asset.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white/75 block font-semibold leading-none">{asset.amount}</span>
                        <span className="text-[9px] text-white/30 leading-none">{asset.usd}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Secure & non-custodial (1/3) */}
            <div className="lg:col-span-1 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-400/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="relative z-10 flex flex-col h-full justify-between text-left">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">02</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.secure.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                    {t('common.views.wallet.cards.secure.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 3/3 */}
          <div className="grid grid-cols-1 gap-6">
            {/* Card 3: Crypto & Token management (3/3) */}
            <div className="group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-full text-left">
                <div className="md:col-span-6 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <WalletIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">03</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.cryptoManagement.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed font-normal">
                    {t('common.views.wallet.cards.cryptoManagement.description')}
                  </p>
                </div>
                <div className="md:col-span-6 bg-black/40 border border-white/[0.04] rounded-xl p-4 w-full">
                  <CryptoManagementWidget />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 2: 1/3 + 2/3, then 2/3 + 1/3                       */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[400px] h-[400px] bg-indigo-700 bottom-0 left-0" />
        <div className="max-w-[1180px] mx-auto px-6">

          {/* Row 1: 1/3 + 2/3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Card 4: Cold Signing with AIRGAP Vault (1/3) */}
            <div className="lg:col-span-1 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-400/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="relative z-10 flex flex-col h-full justify-between text-left">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">04</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.coldSigning.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                    {t('common.views.wallet.cards.coldSigning.description')}
                  </p>
                </div>
                <div className="bg-black/35 border border-white/[0.04] rounded-xl p-3 flex items-center justify-between font-mono text-[9px] mt-auto w-full">
                  <div className="text-center w-[45%] bg-white/[0.02] p-1.5 rounded border border-white/[0.05]">
                    <span className="block text-amber-400 font-bold mb-0.5">{t('common.views.wallet.mock.airgap')}</span>
                    <span className="text-white/20">{t('common.views.wallet.mock.vaultOffline')}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                    <div className="w-4 h-4 rounded-full border border-dashed border-blue-500/40 animate-spin" />
                  </div>
                  <div className="text-center w-[45%] bg-white/[0.02] p-1.5 rounded border border-white/[0.05]">
                    <span className="block text-green-400 font-bold mb-0.5">{t('common.views.wallet.mock.superhero')}</span>
                    <span className="text-white/20">{t('common.views.wallet.mock.appOnline')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Advanced DApp integration (2/3) */}
            <div className="lg:col-span-2 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-full text-left">
                <div className="md:col-span-7 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">05</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.dappIntegration.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed">
                    {t('common.views.wallet.cards.dappIntegration.description')}
                  </p>
                </div>
                <div className="md:col-span-5 bg-black/35 border border-white/[0.04] rounded-xl p-2.5 space-y-1 text-[10px] font-mono w-full">
                  <div className="flex items-center justify-between bg-white/[0.01] p-1 border border-white/[0.05] rounded">
                    <span className="text-white/60">🥞 Superhero.com</span>
                    <span className="text-[8px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-bold border border-green-500/30">{t('common.views.wallet.mock.connected')}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/[0.01] p-1 border border-white/[0.05] rounded">
                    <span className="text-white/60">🏛️ Superhero DEX</span>
                    <span className="text-[8px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-bold border border-green-500/30">{t('common.views.wallet.mock.active')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 2/3 + 1/3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 6: Multisig Support (2/3) */}
            <div className="lg:col-span-2 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-full text-left">
                <div className="md:col-span-6 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">06</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.multisig.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed font-normal">
                    {t('common.views.wallet.cards.multisig.description')}
                  </p>
                </div>
                <div className="md:col-span-6 bg-black/40 border border-white/[0.04] rounded-xl p-4 w-full font-sans">
                  <MultisigWidget />
                </div>
              </div>
            </div>

            {/* Card 7: Buy .chain names (1/3) */}
            <div className="lg:col-span-1 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-400/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="relative z-10 flex flex-col h-full justify-between text-left">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <Link2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">07</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.chainNames.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                    {t('common.views.wallet.cards.chainNames.description')}
                  </p>
                </div>
                <div className="bg-black/35 border border-white/[0.04] rounded-xl p-3 font-mono space-y-2 mt-auto w-full">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={t('common.views.wallet.mock.chainNameExample')}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg py-1.5 pl-3 pr-20 text-[11px] text-blue-400 outline-none animate-[pulse_3s_infinite]"
                    />
                    <span className="absolute right-2 px-1.5 py-0.5 rounded bg-green-500/25 border border-green-500/30 text-green-400 font-bold text-[9px] uppercase">
                      {t('common.views.wallet.mock.available')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-white/40 px-1 pt-1 border-t border-white/[0.05]">
                    <span>{t('common.views.wallet.mock.aens')}</span>
                    <span className="text-blue-400">{t('common.views.wallet.mock.registered')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 3: 1/3 + 2/3, then 3/3                              */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[500px] h-[500px] bg-cyan-800 top-1/4 -left-32" />
        <div className="max-w-[1180px] mx-auto px-6">

          {/* Row 1: 1/3 + 2/3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Card 8: Biometric Login (1/3) */}
            <div className="lg:col-span-1 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-400/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="relative z-10 flex flex-col h-full justify-between text-left">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <Fingerprint className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">08</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.biometric.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                    {t('common.views.wallet.cards.biometric.description')}
                  </p>
                </div>
                <div className="bg-black/35 border border-white/[0.04] rounded-xl p-3 flex flex-col items-center justify-center font-mono space-y-2 mt-auto w-full">
                  <div className="relative w-10 h-10 flex items-center justify-center border border-blue-500/20 bg-blue-500/5 rounded-full ring-4 ring-blue-500/10 animate-pulse">
                    <Fingerprint className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">{t('common.views.wallet.mock.touchFaceIdActive')}</span>
                </div>
              </div>
            </div>

            {/* Card 9: Import Accounts (2/3) */}
            <div className="lg:col-span-2 group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-full text-left">
                <div className="md:col-span-7 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <KeyRound className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">09</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.importAccounts.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed">
                    {t('common.views.wallet.cards.importAccounts.description')}
                  </p>
                </div>
                <div className="md:col-span-5 bg-black/35 border border-white/[0.04] rounded-xl p-3 font-mono text-[9px] text-white/40 space-y-2 w-full">
                  <div className="flex gap-1.5 border-b border-white/[0.05] pb-1.5">
                    <span className="text-blue-400 font-bold border-b border-blue-400/50 pb-0.5">{t('common.views.wallet.mock.privateKey')}</span>
                    <span className="text-white/20">{t('common.views.wallet.mock.seedPhrase')}</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded py-1 px-1.5 text-white/30 truncate select-none">
                    ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                  </div>
                  <div className="text-[8px] text-white/30 flex items-center justify-between">
                    <span>{t('common.views.wallet.mock.standardFormat')}</span>
                    <span className="text-green-400 font-semibold">{t('common.views.wallet.mock.secureImport')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 3/3 */}
          <div className="grid grid-cols-1 gap-6">
            {/* Card 10: Convenient Address Book (3/3) */}
            <div className="group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full text-left">
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                      <BookUser className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xs font-mono text-white/30 tracking-wider">10</span>
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{t('common.views.wallet.cards.addressBook.title')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed font-normal">
                    {t('common.views.wallet.cards.addressBook.description')}
                  </p>
                </div>
                <div className="lg:col-span-7 bg-black/40 border border-white/[0.04] rounded-xl p-4 w-full">
                  <AddressBookWidget />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  DOWNLOAD SECTION                                            */}
      {/* ============================================================ */}
      <section id="download" className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[400px] h-[400px] bg-blue-700 bottom-0 right-0" />

        <div className="max-w-[1180px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              {t('common.views.wallet.download.eyebrow')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              {t('common.views.wallet.download.title')}
            </h2>
            <p className="max-w-2xl mx-auto text-[15px] text-white/40 leading-relaxed">
              {t('common.views.wallet.download.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Desktop Web */}
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 text-center transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.06]">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white/90 mb-2">{t('common.views.wallet.download.desktopWeb.title')}</h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                {t('common.views.wallet.download.desktopWeb.description')}
              </p>
              <a
                href="https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {t('common.views.wallet.download.getChromeExtension')}
              </a>
            </div>

            {/* Mobile Browser */}
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 text-center transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.06]">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white/90 mb-2">{t('common.views.wallet.download.mobileBrowser.title')}</h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                {t('common.views.wallet.download.mobileBrowser.description')}
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.superhero.cordova&pli=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('common.views.landing.mobile.googlePlay')}
                </a>
                <a
                  href="https://apps.apple.com/bg/app/superhero-wallet/id1502786641"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('common.views.landing.mobile.appStore')}
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ                                                         */}
      {/* ============================================================ */}
      <section id="faq" className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              <HelpCircle className="w-4 h-4 inline-block mr-1 -mt-0.5" />
              {t('common.layout.faq')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              {t('common.views.wallet.faq.title')}
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_CATEGORIES.map((cat, i) => (
              <FaqCategory
                key={cat.key}
                index={i + 1}
                title={t(`common.views.wallet.faq.categories.${cat.key}.title`)}
                items={cat.items.map((itemKey) => ({
                  question: t(`common.views.wallet.faq.categories.${cat.key}.items.${itemKey}.question`),
                  answer: t(`common.views.wallet.faq.categories.${cat.key}.items.${itemKey}.answer`),
                }))}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BOTTOM CTA                                                  */}
      {/* ============================================================ */}
      <section className="relative py-20 border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/[0.03] to-transparent" />
        <div className="max-w-[1180px] mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/95 mb-4">
            {t('common.views.wallet.cta.title')}
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed mb-10">
            {t('common.views.wallet.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a
              href="https://play.google.com/store/apps/details?id=com.superhero.cordova&pli=1"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/25 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              {t('common.views.landing.mobile.googlePlay')}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://apps.apple.com/bg/app/superhero-wallet/id1502786641"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-500/25 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              {t('common.views.landing.mobile.appStore')}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-blue-400/20 hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Globe className="w-4 h-4" />
              {t('common.views.wallet.download.chromeExtension')}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>

        </div>
      </section>
    </div>
  );
}
