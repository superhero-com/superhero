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
      id: 'what-is-trendminer',
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
      title: 'What is the Governance & Voting section?',
      answer:
        'The Governance & Voting page provides a unified interface for browsing polls, voting, managing delegations, and viewing your on‑chain governance activity. All governance functions are accessible through tabs within a single page.',
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
    <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      padding: '24px 16px',
      color: '#fff',
      background: '#0f1115',
      borderRadius: 16,
    }}>
      <div style={{
        borderRadius: 16,
        padding: '28px 22px',
        background: 'linear-gradient(90deg, #111317, #1a1f26)',
        color: '#fff',
        marginBottom: 16,
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Welcome</div>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>Superhero — the all‑in‑one social + crypto app</div>
        <div style={{ fontSize: 15, opacity: 0.9, marginTop: 8 }}>Discover trends, mint community tokens, trade on bonding curves, chat in real‑time, and govern treasuries — in partnership with Quali.chat.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <Badge label="Create" />
          <Badge label="Trade" />
          <Badge label="Vote" />
          <Badge label="Earn" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>On this page</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {categories.map((cat) => (
              <a key={cat} href={`#${cat.replace(/\s+/g, '-').toLowerCase()}`} style={{ textDecoration: 'none', color: '#fff', fontSize: 14, opacity: 0.9 }}>
                {cat}
              </a>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.75 }}>Tip: Start with Getting Started, then explore Trendminer and DAO & Governance.</div>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Getting Started</div>
            <div style={{ fontSize: 15, opacity: 0.9 }}>
              New here? Here’s the short version:
            </div>
            <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Install Superhero Wallet and fund it with a little AE.</li>
              <li>Go to Trending and sort by Market Cap to explore tokens.</li>
              <li>Open a token, connect your wallet, and try a small Buy.</li>
              <li>Visit the DAO page to see treasury and proposals.</li>
            </ul>
          </Card>
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Features at a glance</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
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
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{cat}</div>
              <div style={{ display: 'grid', gap: 10 }}>
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
    <span style={{
      padding: '6px 10px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.2)',
      fontSize: 12,
    }}>
      {label}
    </span>
  );
}

function Card({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{
      padding: 16,
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
      color: '#fff',
    }}>
      {children}
    </section>
  );
}

function QAItem({ title, answer }: { title: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 0,
          padding: '10px 12px',
          cursor: 'pointer',
          fontWeight: 700,
          color: '#fff',
        }}
      >
        {title}
        <span style={{ float: 'right', opacity: 0.6 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 15, opacity: 0.9 }}>
          {answer}
        </div>
      )}
    </div>
  );
}


