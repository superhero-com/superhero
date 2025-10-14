import React, { useMemo, useState } from 'react';

type Question = { id: string; title: string; answer: React.ReactNode; category: string };

export default function FAQ() {
  const questions: Question[] = useMemo(() => [
    {
      id: 'what-is-superhero',
      category: 'Overview',
      title: 'What is Superhero?',
      answer:
        'Superhero is a social + crypto app on the aeternity blockchain. You can discover content, create posts, tip, trade community tokens, and take part in on‑chain governance — all in one place.',
    },
    {
      id: 'chat-powered-by-quali',
      category: 'Chat & Community',
      title: 'Who powers chat here?',
      answer:
        'We partner with Quali.chat — a quality chat app for crypto people. Expect realtime conversations, moderation tools, and crypto‑friendly UX. Each token has a public room; holders can coordinate faster.',
    },
    {
      id: 'what-is-trending',
      category: 'Overview',
      title: 'What is Trendminer?',
      answer:
        'Trendminer lets you tokenize trending ideas. Creators launch community tokens on a bonding curve. Price adjusts with buys and sells; no order books, just math. A small fee flows into a token treasury (DAO) to fund community initiatives.',
    },
    {
      id: 'quick-start',
      category: 'Getting Started',
      title: 'Quick start: how do I begin?',
      answer: (
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Install Superhero Wallet and fund it with a little AE.</li>
          <li>Open Trending and sort by Market Cap to see established communities.</li>
          <li>Tap a token, connect wallet, and buy a small amount to try it.</li>
          <li>Join the token’s DAO and vote on proposals when available.</li>
        </ul>
      ),
    },
    {
      id: 'buy-sell',
      category: 'Trading',
      title: 'How do I buy or sell a token?',
      answer:
        'On a token page, use the trade card. Choose Buy or Sell, review the live quote, and confirm in your wallet. Tokens are minted/burned against AE along the bonding curve.',
    },
    {
      id: 'fees',
      category: 'Trading',
      title: 'Where do fees go?',
      answer:
        'A portion of each trade funds the token’s DAO treasury. Holders can propose and vote to allocate funds for growth, bounties, or community rewards.',
    },
    {
      id: 'holders-vs-tx',
      category: 'Trading',
      title: 'What are Holders and Transactions tabs?',
      answer:
        'Holders shows top addresses and balances for the token. Transactions lists recent buys/sells with timestamps and transaction hashes.',
    },
    {
      id: 'dao',
      category: 'DAO & Governance',
      title: 'How does the DAO work?',
      answer:
        'Every token has a treasury. Anyone can create proposals. Holders vote on‑chain. If a proposal passes, the treasury can pay contributors or fund new ideas.',
    },
    {
      id: 'governance',
      category: 'DAO & Governance',
      title: 'What is the Voting section?',
      answer:
        'The Voting page provides a unified interface for browsing polls, voting, managing delegations, and viewing your on‑chain governance activity. All governance functions are accessible through tabs within a single page.',
    },
    {
      id: 'social',
      category: 'Social & Feed',
      title: 'Is there a social feed?',
      answer:
        'Yes. You can browse posts, comment, and explore communities. Comments and token chats are powered by Quali.chat — real‑time rooms built for crypto‑native communities.',
    },
    {
      id: 'accounts',
      category: 'Accounts & Rankings',
      title: 'What can I see on Accounts pages?',
      answer:
        'Account profiles show owned tokens, created tokens, and activity. Leaderboards highlight the most active creators and traders.',
    },
    {
      id: 'invites',
      category: 'Invites & Rewards',
      title: 'What are invitations?',
      answer:
        'Creators can run invite campaigns to grow communities. Invites may grant recognition or rewards depending on the token’s rules.',
    },
    {
      id: 'analytics',
      category: 'Pricing & Analytics',
      title: 'How is Market Cap and pricing shown?',
      answer:
        'We display price and market cap using AE as the unit. Trending defaults to Market Cap so larger communities surface first. Token pages include candlestick charts, recent transactions, and holders to help you read the market.',
    },
    {
      id: 'wallet',
      category: 'Wallet & Security',
      title: 'Which wallet do I need?',
      answer:
        'Use Superhero Wallet for aeternity. Install it, create or import your account, then connect on token pages to trade and participate.',
    },
    {
      id: 'risks',
      category: 'Wallet & Security',
      title: 'Any risks I should know?',
      answer:
        'Volatility and smart‑contract risk are real. Double‑check addresses and amounts before signing. Never risk funds you cannot afford to lose.',
    },
    {
      id: 'help',
      category: 'Support',
      title: 'Where do I get help or report bugs?',
      answer:
        'Reach out via official channels listed in the app. Include the token name, your address, the tx hash, and what happened.',
    },
    {
      id: 'glossary',
      category: 'Glossary',
      title: 'Glossary: AE, sale address, DAO, tx hash',
      answer: (
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>AE: the native coin of the aeternity blockchain.</li>
          <li>Sale address: the contract that mints/burns tokens on the curve.</li>
          <li>DAO: on‑chain treasury + governance for a token community.</li>
          <li>Tx hash: the transaction ID; view in explorers to verify.</li>
        </ul>
      ),
    },
  ], []);

  const categories = useMemo(
    () => Array.from(new Set(questions.map((q) => q.category))),
    [questions],
  );

  return (
    <div className="max-w-[1000px] mx-auto p-6 text-white">
      <div className="rounded-2xl p-7 bg-gradient-to-b from-white/6 to-white/3 text-white mb-4 border border-white/10 backdrop-blur-md">
        <div className="text-sm opacity-90">Welcome</div>
        <div className="text-[32px] font-extrabold leading-tight">Superhero — the all‑in‑one social + crypto app</div>
        <div className="text-[15px] opacity-90 mt-2">Discover trends, mint community tokens, trade on bonding curves, chat in real‑time, and govern treasuries — in partnership with Quali.chat.</div>
        <div className="flex gap-2.5 mt-3.5 flex-wrap">
          <Badge label="Create" />
          <Badge label="Trade" />
          <Badge label="Vote" />
          <Badge label="Earn" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <div className="font-extrabold mb-2">On this page</div>
          <div className="grid gap-1.5">
            {categories.map((cat) => (
              <a key={cat} href={`#${cat.replace(/\s+/g, '-').toLowerCase()}`} className="no-underline text-white text-sm opacity-90 hover:opacity-100 transition-opacity">
                {cat}
              </a>
            ))}
          </div>
          <div className="mt-4 text-xs opacity-75">Tip: Start with Getting Started, then explore Trendminer and DAO & Governance.</div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="font-extrabold mb-2">Getting Started</div>
            <div className="text-[15px] opacity-90">
              New here? Here's the short version:
            </div>
            <ul className="mt-2 pl-4.5 leading-relaxed">
              <li>Install Superhero Wallet and fund it with a little AE.</li>
              <li>Go to Trending and sort by Market Cap to explore tokens.</li>
              <li>Open a token, connect your wallet, and try a small Buy.</li>
              <li>Visit the DAO page to see treasury and proposals.</li>
            </ul>
          </Card>
          <Card>
            <div className="font-extrabold mb-2">Features at a glance</div>
            <ul className="m-0 pl-4.5 leading-relaxed">
              <li>Trending lists with Market Cap default sorting</li>
              <li>Token pages: chat, candlesticks, transactions, holders</li>
              <li>Bonding curve trading (mint/burn) with DAO fee streaming</li>
              <li>DAO pages: treasury, proposals, and voting</li>
              <li>Governance: polls, delegations, and my account activity</li>
              <li>Accounts: owned/created tokens and rankings</li>
              <li>Invitations: community growth campaigns</li>
              <li>Realtime updates via websockets</li>
            </ul>
          </Card>

          {categories.map((cat) => (
            <Card key={cat} id={cat.replace(/\s+/g, '-').toLowerCase()}>
              <div className="font-extrabold mb-2">{cat}</div>
              <div className="grid gap-2.5">
                {questions.filter((q) => q.category === cat).map((q) => (
                  <QAItem key={q.id} title={q.title} answer={q.answer} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1.5 rounded-full bg-white/12 border border-white/20 text-xs">
      {label}
    </span>
  );
}

function Card({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
    >
      {children}
    </section>
  );
}

function QAItem({ title, answer }: { title: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left bg-transparent border-0 p-3 cursor-pointer font-bold text-white hover:bg-white/10 transition-colors"
      >
        {title}
        <span className="float-right opacity-60">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-white/10 text-[15px] opacity-90">
          {answer}
        </div>
      )}
    </div>
  );
}


