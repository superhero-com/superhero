/* eslint-disable max-len */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useNavigate } from 'react-router-dom';
import { AeButton } from '@/components/ui/ae-button';
import FooterSection from '../components/layout/FooterSection';

const WHITEPAPER_CONTENT = `# Superhero Technical Whitepaper

**Version 0.7 — February 2026**

## Abstract

Superhero is a decentralized social platform built on the æternity blockchain, combining on-chain content publishing with community-driven trend token economies. The platform consists of a web and mobile application offering social posting, tipping, trading hashtag trends, DEX trading, governance participation, and real-time analytics. At its core, the Tipping.aes smart contract provides an immutable, on-chain registry of user-generated posts with support for both direct and cryptographically delegated posting. Communities are created through a factory contract that deploys bonding curve token sales, DAOs, and management infrastructure, with each community governed by its token holders via on-chain voting on payouts, moderation, and governance changes. An exponential bonding curve prices tokens dynamically based on supply, maintaining a 1% spread between buy and sell prices — split between the community DAO and a four-level affiliation referral system that incentivizes platform growth. Protocol-level DAO tokens are issued proportionally to purchase activity, laying the groundwork for future platform-wide governance. Together, these mechanisms create a self-sustaining ecosystem where value flows directly between creators, communities, and participants without centralized intermediaries.

## Introduction

The dominant social media paradigm concentrates content ownership, monetization, and moderation authority in the hands of centralized platform operators. Users generate the value — through posts, engagement, and community building — yet capture almost none of it. Content can be arbitrarily censored, algorithms are opaque, and creator compensation is mediated by advertising models that misalign platform incentives with user welfare.

Blockchain technology offers a credible alternative: public, permissionless infrastructure where content is immutable, identity is self-sovereign, and economic value flows are transparent and programmable. However, previous attempts at decentralized social platforms have struggled with usability, scalability, and sustainable economic design.

Superhero addresses these challenges by building on the æternity blockchain — a platform purpose-built for scalability through state channels, efficient on-chain computation via the FATE virtual machine, and expressive smart contracts written in the Sophia language. Rather than simply replicating centralized social features on-chain, Superhero introduces a novel economic layer: community-scoped tokens governed by bonding curves and decentralized autonomous organizations (DAOs), creating self-sustaining micro-economies around shared interests.

This whitepaper provides a comprehensive technical specification of the Superhero protocol: its content layer, community token economics, governance mechanisms, affiliation system, and the smart contract architecture that underpins them. Each component is designed to function independently while composing into a coherent system where creators, communities, and participants share directly in the value they collectively produce.

## Design Principles

The architecture of Superhero is guided by the following core principles:

1. **Censorship Resistance** — All content is published on-chain as immutable state. No single entity can remove, alter, or suppress a post after it has been recorded. Moderation operates at the community application layer through token-holder governance, not at the protocol level.

2. **Self-Sovereign Identity** — Users are identified by their æternity wallet addresses. There is no account creation process controlled by a third party. Users own their keys, their identity, and their content.

3. **Transparent Economics** — Every token price, every DAO treasury balance, every referral payout, and every governance vote is verifiable on-chain. There are no hidden fees, opaque algorithms, or undisclosed revenue splits.

4. **Composability** — The protocol is built from modular, interface-driven smart contracts (TokenSale, BondingCurve, DAO, CommunityManagement) that can be individually upgraded or replaced through governance votes without disrupting the broader system.

5. **Sustainable Incentive Alignment** — The bonding curve spread, affiliation rewards, and ProtocolDAO token issuance create a closed-loop incentive system where every participant — creator, community member, referrer, and governance participant — is economically rewarded for contributing to platform growth.

6. **Progressive Decentralization** — The system is designed to transition governance authority from its initial deployers to the community over time, with the ProtocolDAO token serving as the foundation for platform-wide decision-making.

## Web & Mobile App

- React-Vite web app & react-native mobile app
- Social posting and tipping with wallet‑based identity
- DEX trading and liquidity management
- On-chain governance views and participation
- Trendminer analytics: trending tokens, charts, and real‑time data

## Superhero Onchain ID

The ProfileRegistry.aes contract is the decentralized identity layer of the Superhero platform, deployed on the æternity blockchain. Written in Sophia (compiler version ≥ 6), it provides an on-chain registry of user profiles and public names, enabling self-sovereign identity management without reliance on centralized account systems.

#### Data Model

Each profile is represented as a \`profile\` record, combining user-facing metadata with multiple identity sources:

- **fullname** — A free-text display name (max 64 characters).
- **bio** — A short biography or description (max 280 characters).
- **avatarurl** — A URL or identifier pointing to the user's avatar image (max 512 characters).
- **username** — An optional custom name chosen by the user, unique across the platform.
- **x_username** — An optional X (formerly Twitter) handle, verified through backend attestation.
- **chain_name** — An optional æternity chain name (AENS), with an associated expiration timestamp.
- **display_source** — An enum (\`Custom | Chain | X\`) indicating which name source the user prefers to display publicly.
- **chain_expires_at** — An optional expiration timestamp for the linked chain name.

Profiles are stored in a map indexed by æternity address (\`profiles_by_address\`), ensuring one profile per wallet. Three additional maps — \`custom_owner\`, \`chain_owner\`, and \`x_owner\` — enforce global uniqueness of names across their respective namespaces, all keyed by normalized name strings.

#### Name Types and Registration

The contract supports three distinct categories of public names, each with different trust levels and registration mechanisms:

1. **Custom Names** (\`set_custom_name\`) — Any user can claim an available name directly. The caller's address is recorded as the owner. Custom names have the lowest priority and can be preempted by verified names (Chain or X) in case of conflict.

2. **Chain Names** (\`set_chain_name\`) — Linked to æternity Name System (AENS) names. The caller provides the chain name and its expiration timestamp. Chain names carry verified status and can forcibly displace a custom name occupying the same normalized key — the displaced user's custom name is automatically renamed with a random suffix, and a \`CustomNameAutoRenamed\` event is emitted.

3. **X Names** (\`set_x_name_with_attestation\`) — Linked to X (Twitter) handles through a cryptographic attestation flow:
   - The backend signer (configured at contract deployment) generates an attestation message containing the caller's address, the normalized X username, an expiry timestamp, and a unique nonce.
   - This message is hashed using Blake2b and prepended with the æternity signed-message prefix (\`"aeternity Signed Message:\\n"\` with a fixed 28-byte header), producing a 60-byte payload.
   - The resulting digest is verified against the backend signer's signature using \`Crypto.verify_sig\`.
   - Nonces are tracked on-chain (\`nonce_used\`) to prevent attestation replay.

   Like chain names, X names carry verified status and can preempt custom name ownership.

Each name type can be independently cleared by its owner (\`clear_custom_name\`, \`clear_chain_name\`, \`clear_x_name\`), releasing the name for future registration by other users.

#### Name Resolution

The contract exposes a \`resolve_public_name\` entrypoint that resolves a name string to an æternity address. Resolution follows a priority order: chain names take precedence over X names, which take precedence over custom names. This hierarchy reflects the trust level of each name source — on-chain verified names are prioritized over attestation-based names, which in turn are prioritized over self-declared custom names.

#### Conflict Resolution

When a verified name (Chain or X) is registered with a normalized key that conflicts with an existing custom name owned by a different user, the contract performs automatic conflict resolution:

- The custom name owner's profile is updated with an auto-generated alternative name consisting of the original name base plus a random four-digit suffix (e.g., \`alice\` → \`alice_4827\`).
- The \`CustomNameAutoRenamed\` event is emitted with both the original and new name, enabling frontends to notify the affected user.
- If the generated suffix collides with an existing name, the contract retries with different entropy until a unique candidate is found.

This mechanism ensures that verified identities always have priority access to their canonical name, while displaced users retain a functional (if modified) custom name.

#### Display Source

Users can set their preferred display source via \`set_display_source\`, choosing between \`Custom\`, \`Chain\`, or \`X\`. This preference is stored on-chain and signals to frontends and indexers which name to render as the user's primary public identity.

#### Events

All profile and name mutations emit typed events, enabling off-chain indexers and frontends to subscribe to identity changes in real time:

- \`ProfileUpdated(address, string)\` — Emitted when fullname, bio, or avatar URL is changed.
- \`CustomNameUpdated(address, string)\` — Emitted when a custom name is set or cleared.
- \`ChainNameUpdated(address, string)\` — Emitted when a chain name is set or cleared.
- \`XNameUpdated(address, string)\` — Emitted when an X name is set or cleared.
- \`DisplaySourceUpdated(address, string)\` — Emitted when the display source preference is changed.
- \`CustomNameAutoRenamed(address, string)\` — Emitted when a custom name is forcibly renamed due to a verified name conflict.

The contract exposes a \`get_state()\` entrypoint that returns the full contract state, including all profiles, name ownership maps, used nonces, and the contract version identifier (currently \`"v1"\`). This allows clients and indexing services to reconstruct the complete identity registry from the contract's state tree.

## Posting & Tipping

The Tipping.aes contract is the foundational content layer of the Superhero platform, deployed on the æternity blockchain. Written in Sophia (compiler version ≥ 5), it provides an immutable, on-chain registry of user-generated posts, enabling censorship-resistant social content publishing.

#### Data Model

Each post is represented as a \`PostWithoutTip\` variant, combining structured metadata with an arbitrary list of media references:

- **tip_meta** — A record containing:
  - \`sender\` — The æternity address of the post's author.
  - \`title\` — The textual content or title of the post.
  - \`timestamp\` — The on-chain timestamp (\`Chain.timestamp\`) at the moment of posting.
- **media** — A list of strings representing media URLs or identifiers attached to the post.

Posts are stored in a map indexed by a monotonically increasing integer (\`tip_id\`), ensuring a deterministic, append-only ordering of all content ever published through the contract.

#### Posting Mechanisms

The contract exposes two stateful entrypoints for creating posts:

1. **Direct posting** (\`post_without_tip\`) — The simplest path. The caller's address (\`Call.caller\`) is recorded as the author. This is the standard method for users interacting directly with the contract via a connected wallet.

2. **Delegated posting via signature** (\`post_without_tip_sig\`) — Enables a third party (e.g., a backend relayer or another user) to submit a post on behalf of an author. The author's identity is verified cryptographically:
   - The post title and media are concatenated into a single string.
   - This string is hashed using Blake2b.
   - The hash is prepended with the æternity signed-message prefix (\`"aeternity Signed Message:\\n"\` with a fixed 28-byte header), producing a 60-byte payload.
   - A second Blake2b hash is computed over this prefixed payload.
   - The resulting digest is verified against the provided signature and author address using \`Crypto.verify_sig\`.

   This mechanism allows gasless or relayed posting: a user signs a message off-chain, and any account can submit the transaction, while the on-chain record correctly attributes authorship to the signer.

Each successful post emits a \`PostWithoutTipReceived(author, title)\` event, enabling off-chain indexers and frontends to subscribe to new content in real time without polling contract state.

The contract exposes a \`get_state()\` entrypoint that returns the full contract state, including all posts and the contract version identifier (currently \`"v3"\`). This allows clients and indexing services to reconstruct the complete post history from the contract's state tree.

## Community Factory

The CommunityFactory.aes implementation, is a comprehensive factory for managing the collection registry, deploying bonding curve token sale, DAO and other supporting contracts specific to a community. This implementation also enables the purchase of an initial token count with the creation of a new community as part of a collection.

The core token sale logic resides in AffiliationBondingCurveTokenSale.aes. It is deployed via the factory as part of the community creation process.

The factory maintains a registry of created collections, including governance data for community and token naming. Each collection allows the creation of unique tokens within it.

Each created community, along with its associated AEX-9 token, is recorded in a registry of deployed communities. This registry ensures the uniqueness of each community's name within the collection and mandates that the token name matches its symbol. Additionally, it enforces character limitations and requires the use of only whitelisted characters as specified by the collection.

The factory is designed for a one-time, static deployment, after which it can be reused for all future collections. The community registry functions as a means to track community token sales originating from the factory, thereby mitigating potential spam and enabling an index over created communities.

## ProtocolDAO Token

The factory issues protocol DAO tokens during buy transactions. These protocol DAO tokens are AEX-9 tokens designed to encourage user participation on the platform. Users can stake these tokens to vote on proposals in the future. This mechanism aims to foster a more engaged and active community within the platform. Additionally, staking these tokens may provide users with various benefits and incentives. Users receive ProtocolDAO-tokens equivalent to 1,000 times the value of the each buy transaction. While the functionality for the ProtocolDAO is not yet implemented, the ProtocolDAO-token serves as a foundation for future governance and signaling mechanisms.

## Community Management

The CommunityManagement.aes contract, is integral to the setup, serving the community meta information and management. The contract is deployed as part of the community creation process through the factory contract. It includes a system for managing moderator accounts, which are appointed through DAO votes.

These moderator accounts are empowered to designate certain users as 'muted' within the contract. Additionally, the module specifies the minimum token amount required for write access in the respective community for users with verified accounts. This threshold can be altered through a DAO vote.

## DAO and DAO Vote

The DAO.aes contract, deployed via the factory, serves dual roles as both the owner and beneficiary of a token sale. This contract receives all proceeds from the token sale and has administrative authority over it.

Within this framework, token holders that, at the given time, own greater or equal to the community threshold amount of tokens, can initiate new token votes via the DAO contract, requiring a donation of 555 AE towards the DAO, addressing various subjects:

- \`VotePayout\` This vote subject concerns disbursing the entire balance of the DAO to the specified account.
- \`VotePayoutAmount\` This vote subject concerns disbursing the specified balance of the DAO to the specified account.
- \`ChangeDAO\` Used to transfer complete control of the DAO - including ownership, beneficiary rights of the token sale, and accumulated funds - to another DAO. The new DAO contract must implement the \`is_dao() = true\` method to prevent unintended transfers to non-DAO accounts.

Additional vote subjects are implemented for community and community management:

- \`ChangeMinimumTokenThreshold\` Alters the minimum token threshold required in community management.
- \`AddModerator\` Appoints a new moderator to the community.
- \`DeleteModerator\` Removes a moderator from the community.

Each vote is set with a closing height of 2 weeks, measured in key-blocks, defining the period within which token holders can participate.

The user interaction with the voting process includes several possible actions:

- \`vote\` Records a token holder's preference (in favor or against) on a subject. The tokens used for voting must be allowed for the vote contract and will be locked by it.
- \`revoke_vote\` Allows a token holder to retract their vote and reclaim their locked token stake.
- \`withdraw\` After the vote's closing height, this function enables users to retrieve their locked token stake without impacting the vote's outcome.

Votes must meet certain criteria to be executed by the DAO:

- Initiating a vote requires paying 555 AE, which goes to the DAO.
- Votes remain open for two weeks, measured in key-blocks.
- A minimum of 55% of the vote stake in favor.
- Participation of at least 10% of the total token stake.

Successful votes are time-sensitive:

- Default expiration of approximately 2 days after the vote closes.
- During this period, the result must be executed or applied.
- The application of successful votes can be triggered by any account or even a script via the DAO contract.

ReplaceableDAO.aes implements an interface that community-provided DAOs have to provide in order to be used with the system and to be replaced via a \`ChangeDAO\` vote.

- \`record_sale_transaction\` should be used in replaceable dao implementations and token sales for the DAO to receive proceeds with additional metadata, rather than via Chain.spend. This might be used as an upgrade path for additional logic on how proceeds might be split or used.

## Exponential Bonding Curve

The bonding curve contract for community is specified in BondingCurveExponential.aes. This implements the interface of the BondingCurve found in BondingCurve.aes.

This contract is designed to manage the selling and buying of tokens at prices that vary based on the current supply. The difference in buy and sell curves represents the beneficiary's reward. Notably, selling back the entire supply to the curve is always possible, as the necessary funds are maintained in reserve, in the token sale contract.

It's anticipated that only 10-20% of the total supply will be reached, ensuring a noticeable price increase right from the start of the curve.

Affiliation token sale contract implements an additional 0.5% affiliation fee thus the total spread between buy and sell price is 1% (0.5% to DAO + 0.5% to Affiliation).

### Mathematical Definition

Define the function $buy(x)$:

$$buy(x) = f(x)=0.001 \\cdot e^{(0.00000001 \\cdot x)} - 0.0009999$$

Define the function $sell(x)$:

$$sell(x) = buy(x) \\cdot 0.995$$

Such that the buy price is defined as:

$$\\int_{supply}^{supply+amount} buy(x) \\, dx$$

And the sell return is defined as:

$$\\int_{supply-amount}^{supply} sell(x) \\, dx$$

Resulting in the spread (i.e. community DAO benefit) definition:

$$\\int_{0}^{supply} buy(x) \\, dx - \\int_{0}^{supply} sell(x) \\, dx$$

## Affiliation Bonding Curve Token Sale

The AffiliationBondingCurveTokenSale.aes contract is an advanced implementation of a token sale mechanism that combines the features of a bonding curve based token sale with an affiliation system.

Referral rewards are split across four levels, rewarding users for actively promoting the platform and growth of the community. When an invitee buys tokens, 0.5% of the transaction value is split between the chain of inviters. The reward is distributed among the referrer and higher levels in the referral chain as follows:

- Level 1: 0.3%
- Level 2: 0.125%
- Level 3: 0.05%
- Level 4: 0.025%

This multi-tier referral system ensures that the rewards of community expansion are distributed among several participants, promoting a cooperative and active user community. Additionally, transaction fees from unaffiliated purchases are burned.

It implements the interface for token sales as defined in TokenSale.aes, while using the Bonding Curve and implements a revenue share with the implemented affiliation system in AffiliationTreasury.aes.

## System Architecture

The Superhero protocol is composed of several interdependent smart contract layers and off-chain components that together form a complete decentralized social platform.

### On-Chain Layer

- **Content** - Tipping.aes - Immutable post registry, delegated posting
- **Factory** - CommunityFactory.aes - Collection registry, community deployment, ProtocolDAO token issuance
- **Token Sale** - AffiliationBondingCurveTokenSale.aes - Bonding curve pricing, buy/sell execution, affiliation fee distribution
- **Pricing** - BondingCurveExponential.aes - Exponential price curve computation
- **Governance** - DAO.aes, DAOVote.aes, ReplaceableDAO.aes - Treasury management, proposal creation, voting, DAO migration
- **Community** - CommunityManagement.aes - Moderator management, token threshold enforcement, community metadata
- **Affiliation** - AffiliationTreasury.aes - Multi-level referral reward accounting and distribution
- **Token Standard** - AEX-9 - Fungible token interface for community tokens and ProtocolDAO tokens

### Off-Chain Layer

- **Indexer** — Subscribes to contract events (e.g., \`PostWithoutTipReceived\`) to build a queryable, real-time index of on-chain content and community activity.
- **Backend Relayer** — Facilitates delegated (gasless) posting by accepting signed messages from users and submitting transactions on their behalf.
- **Frontend Applications** — React-Vite web application and React Native mobile application providing the user interface for posting, trading, governance, and analytics.
- **Trendminer** — Analytics engine that aggregates token activity, price movements, and community engagement metrics into real-time trend data and charts.

### Contract Deployment Flow

Community creation follows a deterministic deployment sequence orchestrated by the factory:

1. The factory deploys a new AEX-9 token contract for the community.
2. A BondingCurveExponential contract is instantiated with the community's pricing parameters.
3. An AffiliationBondingCurveTokenSale contract is deployed, referencing the token and bonding curve.
4. A DAO contract is deployed as the owner and beneficiary of the token sale.
5. A CommunityManagement contract is deployed with initial moderator and threshold settings.
6. The community is registered in the factory's on-chain registry.
7. An optional initial token purchase is executed as part of the creation transaction.

## Security Considerations

Security is a first-order design concern across all protocol components.

### Cryptographic Integrity

- **Delegated posting** relies on Blake2b hashing and Ed25519 signature verification (via \`Crypto.verify_sig\`) to ensure that only the legitimate author can authorize content published under their identity. The æternity signed-message prefix prevents cross-protocol replay attacks.
- **Token operations** use the AEX-9 standard's allowance mechanism for vote locking, ensuring tokens cannot be double-spent across concurrent votes.

### Economic Security

- **Bonding curve solvency** — The sell curve is strictly below the buy curve at all supply levels. This guarantees that the reserve held in the token sale contract is always sufficient to buy back the entire circulating supply, preventing bank-run scenarios.
- **Spread allocation** — The 1% spread is deterministically split (0.5% DAO, 0.5% affiliation), with unaffiliated fees burned rather than accumulated, eliminating extraction vectors for unclaimed funds.
- **Vote cost** — The 555 AE requirement to initiate a DAO vote prevents spam proposals and ensures that governance participation carries meaningful economic commitment.

### Governance Security

- **Quorum and supermajority** — Votes require at least 10% token stake participation and 55% approval, preventing low-turnout capture.
- **Time-bounded execution** — Successful votes expire approximately 2 days after closing, limiting the window for stale or context-shifted proposals to be applied.
- **DAO migration safeguard** — The \`ChangeDAO\` vote subject requires the target contract to implement \`is_dao() = true\`, preventing accidental or malicious transfer of treasury funds to non-DAO addresses.
- **Token locking** — Tokens used for voting are locked in the vote contract, preventing vote manipulation through token transfers during an active vote.

### Smart Contract Auditing

All core contracts are written in Sophia, a functional language with strong type safety and no mutable global state, reducing the surface area for reentrancy and state-corruption vulnerabilities. The protocol's contract suite is designed for independent audit and formal verification.

## Token Economics Summary

The Superhero protocol features two distinct token types that serve complementary economic functions:

### Community Tokens (AEX-9)

| Property            | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| **Standard**        | AEX-9 (æternity fungible token)                                             |
| **Issuance**        | Minted on buy, burned on sell via bonding curve                             |
| **Pricing**         | Exponential bonding curve: $f(x) = 0.001 \\cdot e^{0.00000001x} - 0.0009999$ |
| **Buy-Sell Spread** | 1% total (0.5% to community DAO + 0.5% to affiliation)                      |
| **Utility**         | Community governance voting, write-access threshold, community membership   |
| **Solvency**        | Full supply redeemable at all times against bonding curve reserve           |

### ProtocolDAO Token (AEX-9)

| Property           | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| **Standard**       | AEX-9 (æternity fungible token)                                     |
| **Issuance**       | 1,000× the AE value of each community token buy transaction         |
| **Distribution**   | Issued to the buyer's address at time of purchase                   |
| **Utility**        | Future platform-wide governance, proposal voting, staking (planned) |
| **Current Status** | Token issuance active; governance framework in development          |

### Value Flow Diagram

The following summarizes how value moves through the protocol on each community token purchase:

\`\`\`
Buyer pays AE
  ├── 99.0%  → Bonding Curve Reserve (redeemable by sellers)
  ├──  0.5%  → Community DAO Treasury (governed by token holders)
  └──  0.5%  → Affiliation System
                ├── 0.300% → Level 1 Referrer
                ├── 0.125% → Level 2 Referrer
                ├── 0.050% → Level 3 Referrer
                └── 0.025% → Level 4 Referrer
                (if no referrer: burned)

Buyer also receives:
  └── ProtocolDAO Tokens = 1,000 × AE value
\`\`\`

## Conclusion

Superhero represents a fundamental rearchitecture of social platform economics. By anchoring content on an immutable blockchain, governing communities through transparent token-holder DAOs, and pricing participation via mathematically deterministic bonding curves, the protocol eliminates the extractive intermediaries that characterize centralized social media.

The system's design ensures that every participant captures value proportional to their contribution: creators own their content irrevocably, community token holders govern their shared treasury, referrers are rewarded for network growth, and all economic parameters are publicly verifiable on-chain. The exponential bonding curve guarantees perpetual solvency, while the affiliation system and ProtocolDAO token issuance create compounding incentives for organic platform adoption.

Superhero is not merely a decentralized alternative to existing social platforms — it is an entirely new primitive for community formation, economic coordination, and collective governance on the open internet.

## Glossary

| Term                                            | Definition                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AE**                                          | The native cryptocurrency of the æternity blockchain, used for transaction fees, staking, and as the base currency for community token bonding curves.             |
| **AEX-9**                                       | The æternity fungible token standard, analogous to ERC-20 on Ethereum. All community tokens and ProtocolDAO tokens conform to this standard.                       |
| **Bonding Curve**                               | A mathematical function that determines token price as a function of circulating supply. Superhero uses an exponential bonding curve to price community tokens.    |
| **DAO (Decentralized Autonomous Organization)** | An on-chain governance entity controlled by token holders through proposal and voting mechanisms. Each Superhero community has its own DAO governing its treasury. |
| **Delegated Posting**                           | A mechanism allowing a third party to submit a post on behalf of an author, verified through cryptographic signatures, enabling gasless user experiences.          |
| **FATE VM**                                     | The virtual machine powering smart contract execution on the æternity blockchain, optimized for functional language execution.                                     |
| **Key-Block**                                   | A block in the æternity blockchain produced by miners/validators, used as the time reference for vote durations and governance deadlines.                          |
| **ProtocolDAO Token**                           | A platform-wide governance token issued proportionally to community token purchase activity, intended for future protocol-level decision-making.                   |
| **Sophia**                                      | The functional smart contract language used on the æternity blockchain, featuring strong static typing and no mutable global state.                                |
| **Spread**                                      | The difference between the buy and sell price on the bonding curve, representing the fee distributed to the community DAO and affiliation system.                  |
| **State Channel**                               | An æternity Layer 2 scaling mechanism enabling off-chain transactions with on-chain settlement guarantees.                                                         |
| **Trendminer**                                  | The Superhero analytics engine that aggregates and surfaces real-time token activity, price movements, and community engagement trends.                            |
`;

const Whitepaper = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="max-w-[980px] mx-auto p-4">
        <div className="mb-4">
          <AeButton
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            variant="ghost"
            size="sm"
            outlined
            className="!border !border-solid !border-white/15 hover:!border-white/35"
          >
            ← Back
          </AeButton>
        </div>

        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold text-white mb-2">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold text-white mt-10 mb-3 border-b border-white/10 pb-2">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold text-white mt-6 mb-2">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-semibold text-white/90 mt-5 mb-2 uppercase tracking-wide">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="text-white/80 mb-4 leading-relaxed">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 text-white/80 mb-4 leading-relaxed space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 text-white/80 mb-4 leading-relaxed space-y-2">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
              inline ? (
                <code className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ) : (
                <code className="bg-white/5 border border-white/10 rounded-lg px-0.5 text-white/80 text-sm font-mono leading-relaxed overflow-x-auto whitespace-pre">
                  {children}
                </code>
              ),
            pre: ({ children }) => (
              <pre className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 overflow-x-auto">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-white/80 border-collapse">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-white/20">{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="text-left py-2 px-3 text-white/60 font-medium uppercase text-xs tracking-wide">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="py-2.5 px-3 text-white/80 leading-relaxed">{children}</td>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-white/20 pl-4 my-4 text-white/60 italic">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="border-white/10 my-8" />,
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-white underline underline-offset-2 hover:text-white/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {WHITEPAPER_CONTENT}
        </ReactMarkdown>
      </div>
      <div className="mt-8">
        <FooterSection />
      </div>
    </>
  );
};

export default Whitepaper;
