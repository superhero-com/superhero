/* FAQ content for the /faq route's schema.org/FAQPage JSON-LD.
 *
 * The question/answer pairs mirror the visible /faq page, whose copy lives in the `faq`
 * namespace of src/locales/en.json (rendered by src/views/FAQ.tsx). The production Docker
 * image ships dist/ + server/ but not src/, so the page's English strings are snapshotted
 * here rather than read from the locale at runtime. Order follows QUESTION_DEFS in FAQ.tsx;
 * the three list-style questions (quick start, milestones, glossary) join their bullet items
 * into a single answer. Keep this in step with en.json's `faq` entries when that copy changes.
 *
 * Pure and side-effect-free (like server/lib/head.cjs) so it can be unit-tested in isolation
 * from the Express bootstrap. Answer text is user-agnostic static copy; the JSON-LD it feeds
 * is still serialized through head.cjs jsonLdSafe on the way out. */

const FAQ_ENTRIES = [
  {
    question: 'What is Superhero?',
    answer: 'Superhero is a social + crypto app on the aeternity blockchain. You can discover content, create posts, tip, trade community tokens, and take part in on‑chain governance — all in one place.',
  },
  {
    question: 'Who powers chat here?',
    answer: 'We partner with Quali.chat — a quality chat app for crypto people. Expect realtime conversations, moderation tools, and crypto‑friendly UX. Each token has a public room; holders can coordinate faster.',
  },
  {
    question: 'What is Trendminer?',
    answer: 'Trendminer lets you tokenize trending ideas. Creators launch community tokens on a bonding curve. Price adjusts with buys and sells; no order books, just math. A small fee flows into a token treasury (DAO) to fund community initiatives.',
  },
  {
    question: 'Quick start: how do I begin?',
    answer: 'Install Superhero Wallet and fund it with a little AE. Open Trending and sort by Market Cap to see established communities. Tap a token, connect wallet, and buy a small amount to try it. Join the token\'s DAO and vote on proposals when available.',
  },
  {
    question: 'How do I buy or sell a token?',
    answer: 'On a token page, use the trade card. Choose Buy or Sell, review the live quote, and confirm in your wallet. Tokens are minted/burned against AE along the bonding curve.',
  },
  {
    question: 'Where do fees go?',
    answer: 'A portion of each trade funds the token\'s DAO treasury. Holders can propose and vote to allocate funds for growth, bounties, or community rewards.',
  },
  {
    question: 'What are Holders and Transactions tabs?',
    answer: 'Holders shows top addresses and balances for the token. Transactions lists recent buys/sells with timestamps and transaction hashes.',
  },
  {
    question: 'How does the DAO work?',
    answer: 'Every token has a treasury. Anyone can create proposals. Holders vote on‑chain. If a proposal passes, the treasury can pay contributors or fund new ideas.',
  },
  {
    question: 'What is the Voting section?',
    answer: 'The Voting page provides a unified interface for browsing polls, voting, managing delegations, and viewing your on‑chain governance activity. All governance functions are accessible through tabs within a single page.',
  },
  {
    question: 'Is there a social feed?',
    answer: 'Yes. You can browse posts, comment, and explore communities. Comments and token chats are powered by Quali.chat — real‑time rooms built for crypto‑native communities.',
  },
  {
    question: 'What can I see on Accounts pages?',
    answer: 'Account profiles show owned tokens, created tokens, and activity. Leaderboards highlight the most active creators and traders.',
  },
  {
    question: 'What is the Superhero Rewards Program?',
    answer: 'The Superhero Rewards Program lets you earn AE tokens by completing milestones: verifying your X account, inviting new users, and posting about Superhero on social media. Complete milestones to unlock phases and earn up to 200 AE tokens.',
  },
  {
    question: 'What milestones are available?',
    answer: 'Verify X Account & Post — connect your X account and post to prove ownership. Link your X account to SuperheroID on-chain. Post about Superhero — publish 10 posts that include your referral link in the text.',
  },
  {
    question: 'How do I claim my rewards?',
    answer: 'Once a milestone is marked as completed, a claim banner appears on the Rewards page. Click the claim button and confirm the transaction in your wallet. A small gas fee applies.',
  },
  {
    question: 'Are rewards guaranteed?',
    answer: 'Eligibility and rewards depend on on-chain activity and are not guaranteed. The program can be paused at any time without notice. Users from blacklisted countries are not eligible. By participating, you agree to the terms shown on the rewards page.',
  },
  {
    question: 'What are invitations?',
    answer: 'The Trading Affiliate Program lets you create invite links funded with AE. When someone claims a link they receive the funded reward. Once 4 of your invitees each spend at least 10 AE in token sales, you can withdraw accumulated referral rewards.',
  },
  {
    question: 'How is Market Cap and pricing shown?',
    answer: 'We display price and market cap using AE as the unit. Trending defaults to Market Cap so larger communities surface first. Token pages include candlestick charts, recent transactions, and holders to help you read the market.',
  },
  {
    question: 'Which wallet do I need?',
    answer: 'Use Superhero Wallet for aeternity. Install it, create or import your account, then connect on token pages to trade and participate.',
  },
  {
    question: 'Any risks I should know?',
    answer: 'Volatility and smart‑contract risk are real. Double‑check addresses and amounts before signing. Never risk funds you cannot afford to lose.',
  },
  {
    question: 'Where do I get help or report bugs?',
    answer: 'Reach out via official channels listed in the app. Include the token name, your address, the tx hash, and what happened.',
  },
  {
    question: 'What is a sponsored name claim?',
    answer: 'We sponsor one free .chain name claim per address. The name must be longer than 12 characters (excluding the .chain suffix). This gives you a human‑readable identity on the æternity blockchain at no cost.',
  },
  {
    question: 'Can I claim more than one name?',
    answer: 'We only sponsor one name claim per address. If you\'d like to claim additional names, you can do so directly in Superhero Wallet — available as a browser extension, native mobile app, or on the web at wallet.superhero.com.',
  },
  {
    question: 'Glossary: AE, sale address, DAO, tx hash',
    answer: 'AE: the native coin of the aeternity blockchain. Sale address: the contract that mints/burns tokens on the curve. DAO: on‑chain treasury + governance for a token community. Tx hash: the transaction ID; view in explorers to verify.',
  },
];

// schema.org/FAQPage — one Question per visible FAQ entry, each with an acceptedAnswer.
function buildFaqPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ENTRIES.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

module.exports = { FAQ_ENTRIES, buildFaqPageJsonLd };
