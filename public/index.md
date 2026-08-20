# Superhero

> Superhero is an on-chain attention market built on the æternity blockchain where users can discover, trade, and govern social trends. It is a decentralized social platform combining blockchain-native content ownership, tradable trend tokens, real-time analytics, and self-sovereign identity.

Superhero represents a new paradigm in attention markets. Unlike traditional social platforms, every post, identity, and transaction lives permanently on-chain — immutable, transparent, and owned by the creator.

## What is Superhero?

Superhero is a decentralized attention market for social trends. Creators own their content, communities become tradable markets, and attention is priced in real time. The platform is accessible via web app and a native mobile app (iOS and Android) with a built-in wallet.

## Platforms

### Web

Superhero is available for web https://superhero.com and requires an external wallet extension to be installed and connected

### Mobile App

The Superhero mobile app is available on iOS (App Store) and Android (Google Play). It includes a built-in wallet, allowing users to post, trade, tip, and govern without needing browser extensions or third-party wallets.

- iOS: https://apps.apple.com/us/app/superhero-web3-communities/id6758045846
- Android: https://play.google.com/store/apps/details?id=com.superhero.apps

### Openclaw Agent or Claude Code Agent Skill

AI agents like Openclaw or Claude can also interact with superhero APIs and smartcontracts directly to execute trades and post content automatically on a cron schedule or manually. The skill also includes scripts to get portfolio, transactions and trending tokens. To install the skill follow instructions here: https://github.com/superhero-com/superhero-agent-skill 


## Core Features

- **Own your content & identity**: On-chain posts and Superhero Onchain ID give creators full ownership. Content is immutable and identity is self-sovereign.
- **Tradable trend markets**: Communities and hashtags become tradable via bonding curve tokens. Attention and conviction are reflected directly in the token price.
- **Real-time attention pricing**: Trend analytics surface trending tokens, hashtags, and communities as a real-time prediction layer over the social graph.
- **Rewards & referrals**: The platform rewards participation through an affiliation system and the ProtocolDAO token. Users can engage, refer, and earn.
- **On-chain posts & tipping**: Immutable content anchored to verifiable events. Creators can be tipped directly — every interaction is transparent and permanent.
- **On-chain identity**: Wallet address, chain names, and X (Twitter) handle are all linked together on-chain, not on a corporate server.

## How It Works

1. **Post on chain**: Create immutable posts that anchor attention to verifiable events. Content lives on the æternity blockchain and cannot be deleted.
2. **Trade trends**: Community and trend tokens are priced via an exponential bonding curve. Buy into trends early — early conviction is rewarded.
3. **Track trends**: Real-time analytics surface trending tokens, hashtags, and communities as a prediction layer over the social graph.
4. **Govern & earn**: Participate in DAOs, vote on proposals, and earn rewards through the affiliation system and ProtocolDAO token.

## SuperheroID

SuperheroID is a decentralized identifier (DID) that links social accounts to a blockchain wallet. It is W3C DID standard compliant, verifiable, portable, and censorship-resistant. It connects wallet addresses, chain names, and an X handle into a single self-sovereign identity that the user fully controls.

## Technology

- Blockchain: æternity
- Identity standard: W3C Decentralized Identifiers (DID)
- Token mechanism: Exponential bonding curve
- Governance: ProtocolDAO with on-chain voting

## Key Concepts

- **Attention market**: A market where social attention is quantified and made tradable through tokens tied to trends, hashtags, and communities.
- **Bonding curve tokens**: Token pricing mechanism where the price increases as more tokens are bought, rewarding early adopters.
- **ProtocolDAO**: The governance token of the Superhero protocol used for voting on proposals and earning rewards.
- **Superhero Onchain ID**: A W3C-standard DID linking a user's wallet, chain name, and social handles into one verifiable identity.

## Frequently Asked Questions

### What is an attention market?

An attention market is a market where social attention is quantified and made tradable. On Superhero every trend, hashtag, and community has its own token whose price rises and falls with the attention and conviction flowing into it, so attention is priced in real time instead of being captured by a platform. Prices move along an exponential bonding curve — early conviction is rewarded because the price increases as more of a token is bought.

### How do I buy a trend token?

1. Install Superhero Wallet (browser extension, native mobile app, or the web wallet at https://wallet.superhero.com) and fund it with a little AE, the native coin of the æternity blockchain.
2. Open the trends index at https://superhero.com/trends/tokens and pick a trend, or go straight to a token page at `https://superhero.com/trends/tokens/<SYMBOL>`.
3. On the token page use the trade card: choose Buy, review the live quote, and confirm the transaction in your wallet. Tokens are minted against AE along the bonding curve — there is no order book, the price is set by the curve.

### What is a SuperheroID?

SuperheroID (Superhero Onchain ID) is a decentralized identifier (DID) that links your æternity wallet address, `.chain` name, and X (Twitter) handle into a single self-sovereign identity. It is W3C DID–standard compliant — verifiable, portable, and censorship-resistant — and is controlled entirely by the user rather than stored on a corporate server.

## Discoverability

- Sitemap: https://superhero.com/sitemap.xml
- Robots: https://superhero.com/robots.txt
- This file: https://superhero.com/llms.txt (also served as https://superhero.com/index.md)

Agent crawlers can traverse Superhero content through predictable, server-rendered URL patterns:

- **Token / trend pages** — `https://superhero.com/trends/tokens/<SYMBOL>`, e.g. https://superhero.com/trends/tokens/COMM. The trend index lives at https://superhero.com/trends/tokens.
- **User profiles** — `https://superhero.com/users/<address>`, where `<address>` is an æternity account address (`ak_…`) or a registered `.chain` name.
- **Account activity** — `https://superhero.com/trends/accounts/<address>`.
- **Posts** — `https://superhero.com/post/<id>`.
- **DAOs** — `https://superhero.com/trends/dao/<sale-address>`.

Each of these routes is server-rendered with SEO metadata and, where applicable, schema.org JSON-LD (WebSite, SocialMediaPosting, Person, CryptoCurrency, and FAQPage on /faq).

## Docs

- [Whitepaper](https://superhero.com/whitepaper)
- [FAQ](https://superhero.com/faq)
