# How to build a Superhero App Extension (Polls example)

This guide shows how to build a full Superhero App Extension using the Governance Polls example. You will add a feed plugin that renders polls, wire voting/revoking via Sophia contracts, add a composer attachment, integrate the Governance backend, and test locally. Follow the steps in order.

See the [Extensions overview](../EXTENSIONS.md) for capabilities, loading modes, configuration and CI checks.

## Prerequisites
- Node 18+, pnpm
- Funded Aeternity testnet account (for signing votes)
- Superhero dev environment and wallet
- Endpoints (confirm or adjust in runtime config):
  - NODE_URL, MIDDLEWARE_URL, AE_COMPILER_URL
  - GOVERNANCE_API_URL

## 1) Project setup
1. Clone the repo and install dependencies.
2. Start the dev server.
3. Review runtime config (`public/superconfig.json` or `window.__SUPERCONFIG__`) and ensure Governance and MDW endpoints are set.

## 2) Scaffold an extension
Use the scaffold script to generate a minimal plugin.
```bash
pnpm run ext:scaffold governance-polls
```
This creates `src/plugins/governance-polls/index.tsx` and `src/plugins/governance-polls/ui/App.tsx`.

## 3) Add capabilities and registration
In `src/plugins/governance-polls/index.tsx`:
- Set `capabilities: ['feed', 'composer']`
- Register `attachments: () => [pollAttachmentSpec]`
- Optionally add a route and menu for discovery

## 4) Implement the feed plugin
- Create a `PollCreatedEntryData` type and a mapper `adaptPollToEntry`.
- Implement `fetchPage(page)` that:
  - Queries open and closed polls via `GovernanceApi.getPollOrdering(false/true)`
  - For each poll, fetch creation time via MDW (contract create tx) and set `createdAt` on entries
  - Sort entries by `createdAt` descending
- Render entries using `PollCreatedCard` and `FeedRenderer`.

## 5) Wire voting flows (Sophia contract integration)
- Use `useAeSdk()` to get `sdk` and ensure wallet is connected before voting.
- Load the poll contract with `GovernancePollACI.json` and call `vote(option)`.
- Optimistically update UI (increment selected option, update totals) and refresh from backend.
- Implement `revoke_vote()` similarly and update UI accordingly.

## 6) Add composer attachment (create polls)
- Import `pollAttachmentSpec` from `features/social/feed-plugins/poll-attachment` and register via `attachments: () => [pollAttachmentSpec]`.
- This surfaces a poll creation UI in the composer toolbar; after posting, it runs its `onAfterPost` hook.

## 6.5) Add translations (optional)
Plugins can include their own translation files for internationalization:

1. Create `locales/` directory in your plugin:
   ```bash
   mkdir -p src/plugins/governance-polls/locales
   ```

2. Create `locales/en.json` with your translation keys:
   ```json
   {
     "createdAPoll": "created a poll",
     "pending": "Pending…",
     "yourVote": "Your vote",
     "retractVote": "Retract vote",
     "votes": "votes"
   }
   ```

3. Create `locales/index.ts` to export translations:
   ```typescript
   import en from './en.json';
   export const translations = { en };
   ```

4. Import and export translations in your plugin definition:
   ```typescript
   import { translations } from './locales';
   
   export default definePlugin({
     meta: { id: 'governance-polls', ... },
     translations,  // Export translations
     setup({ register }) { ... }
   });
   ```

5. Use translations in your components:
   ```typescript
   import { useTranslation } from 'react-i18next';
   
   const { t } = useTranslation('governance-polls');  // Use plugin ID as namespace
   return <span>{t('createdAPoll')}</span>;
   ```

See [Plugin SDK docs](../plugin-sdk.md#translations) for more details.

## 7) Local registration (dev only)
- Temporarily import your new plugin in `src/plugins/local.ts` and add to the `localPlugins` array for local testing.
- Do not commit this if you don’t want it enabled by default; guard with an env flag if needed.

## 8) Testing
- Load the app, ensure feed renders poll cards.
- Click an option to vote; confirm signing flow and UI updates.
- Revoke vote; confirm UI updates and backend reflects the change after refresh.

## 9) Backend integration notes
- Governance endpoints supply ordering, overviews and accept event submissions to speed up cache updates.
- You can change the base URL via runtime config. For advanced cases, add a tiny client wrapper (`src/plugins/governance-polls/client/backend.ts`).
- Consider WebSocket updates or polling intervals for faster UI convergence.

## 10) Troubleshooting
- Wallet not connected: ensure `useWalletConnect` flow and wallet pairing works
- Compiler/runtime mismatch: confirm `AE_COMPILER_URL` and SDK versions
- ACI mismatch or wrong contract address: recompile and point to correct address
- MDW differences: different deployments may expose slightly different transaction shapes; handle both `micro_time` and `block_time`

## 11) Submission checklist
- Extension compiles and passes `pnpm run ext:check`
- Polls render; voting flows work
- Composer poll attachment shows and works

## 12) Submit your extension (Fork + PR)
To contribute your extension to Superhero:
1. Fork the repository to your GitHub account.
2. Create a feature branch (e.g., `feat/polls-extension`).
3. Add your plugin module under `src/plugins/<your-id>/` and any supporting files.
4. Ensure local testing is done via `src/plugins/local.ts` (do not auto-register in production by default).
5. Run `pnpm run ext:check` and fix any validation issues.
6. Open a Pull Request from your fork/branch to this repository with a brief description and screenshots.
7. Our CI will run the extension checks; address any feedback from reviewers.
