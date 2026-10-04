# Shorts testnet feature

Run `npm run start:shorts:testnet` and open `http://127.0.0.1:5180/shorts`. The route and navigation entry are available only in development with `VITE_SHORTS_TESTNET_MVP=1`. The script selects `ae_uat`; the feature uses the existing Superhero wallet providers and never imports test keys.

Start the separate Shorts API on loopback port 3334 using its `src/shorts/README.md`. Its testnet deployment supplies the ACI and contract identity. The API verifies the deployed bytecode before serving.

Watch freely and connect your testnet wallet to Like. A Like requires only its paid contract transaction; no message signature or API sign-in is requested. Public Like counts and creator revenue come from verified chain state/events. Connecting a wallet returns to the Like review and never automatically pays. Network and signer identity are checked before payments.

Creator Studio separately requires a sign-in message for uploads and private creator actions. Funding, claims, refunds and withdrawals also require their wallet transaction. Creator sessions are held in memory and cleared when the account changes. Private receipt submission is optional for already signed-in viewers and is not required to count or index a Like.

The creator Studio provides uploads, actual processed size, hosting quotes, wallet/reward funding, coverage dates, on-chain earnings and claims, measured browser reach/watch time and verified explorer receipts. Feed approval belongs to the operator, either through its authenticated Moderation tab or the API's local operator console. Hosting coverage is independent of feed review: pending and feed-excluded videos can purchase or renew hosting. The creator sees community-guidelines status; frame scores, model receipts, and classification evidence remain operator-only. Pending paid purchases can be retried or refunded after their contract deadline. The hosting worker also recovers them after restart.

The public feed uses reviewed topics, explicit interests, Superhero contract follows, language, recency and creator diversity. Follow/unfollow uses the same wallet-signed social contract and relationship cache as profiles; Following and For You use those relationships for the current feed's creators. Wallet switches select a separate relationship cache. Old browser-only follows are ignored, and resetting feed preferences never changes contract follows. An unavailable social API shows retry guidance; no local follow is substituted. Saved videos, interests, hidden creators and not-interested controls remain browser preferences. Payments never affect ranking. Creator-supplied captions are supported; adaptive streaming remains outside this MVP. Actual sampled-frame visual screening runs locally before operator review; a failed/blocked scan prevents feed inclusion, not prepaid hosting. Paid, active videos are shareable through `/shorts?short=<id>`, resolved separately from the ranked feed. Feed-excluded and unreviewed videos open behind a blurred poster and warning; no video or audio loads until the viewer selects “View video.” They can hide it again. The cover is a viewing choice, not a private-media access boundary. Expired or withdrawn videos cannot be played or resolved by link. JEV is implemented as an optional server-side text suggestion adapter and stays disabled until configured. The paid flow is a local web/testnet prototype and does not establish mobile-store payment approval. Native mobile remains a separate integration.

## Immersive viewer

The consumer view shows one portrait video per viewport with vertical scroll snapping. Desktop has previous/next controls; touch screens use native vertical scrolling. Arrow keys navigate, Space/K toggles playback, and M toggles sound when a text field or control is not focused. Playback starts muted, pauses offscreen, pauses in hidden browser tabs and pauses while dialogs are open. Explicit user pauses survive closing an overlay.

The action rail opens the existing paid Like confirmation, copies a local deep link, or opens video details/reporting. A seek bar supports keyboard and pointer interaction. Seeking does not count toward the two-second preview view threshold. Discovery preferences and optional playback measurement are available through the For you menu; upload and creator Studio have separate routes from watching. Studio has its own sidebar and hides the global app sidebar/header; the main shell returns when leaving Studio.

Run the playback regression tests with `npm test -- --run src/features/shorts/__tests__/shorts-viewer.test.tsx`.


## Creator Studio

The upload composer is a four-step journey: Video → Details → Hosting → Review, with numbered steps and Previous/Next controls. Guests can choose a local video and enter details before connecting and verifying a creator wallet. Verification never uploads or pays automatically; Next: Hosting explicitly starts the private resumable transfer. The first wallet connection preserves that guest draft; switching an existing account clears private composer state.

After preparation, choose 7/30/90 days, a custom duration (1–3650 whole days), or an AE budget, funded from the wallet or available rewards. Read-only price estimates use the contract tariff and prepared package size; Next: Review registers the exact quote. The final button states the hosting charge and requests one wallet transaction. Feed status and additional network fees are disclosed separately. Existing Studio top-ups retain their hosting dialog.

Preparation, review and purchase results stay inside the composer. Wallet rejection returns to review; expired quotes return to hosting. Confirmed payments awaiting activation and ambiguous wallet responses show tracking guidance instead of another pay button. Successful activation offers Watch & share and Studio. Draft files/details are held in memory while staying in Shorts, not persisted across a page reload. Uploaded private drafts remain in Studio. Changing already prepared metadata creates a new unpaid draft; unchanged back-navigation reuses the prepared video. Mobile has a collapsible preview and sticky Previous/Next actions.

- `/shorts/studio`: overview with live available rewards, measured performance and latest content.
- `/shorts/studio/content`: searchable, status-filtered content library.
- `/shorts/studio/analytics`: 7/28/90-day UTC reports, daily views/reach/watch time/earnings/paid Likes, completion, prior-period comparisons when coverage permits, and privacy-suppressed discovery sources. Creator accruals exclude hosting refunds and wallet claims.
- `/shorts/studio/revenue`: lifetime contract balances, claim review and dated verified activity.
- `/shorts/studio/hosting`: coverage warnings, wallet/reward top-ups, pending-purchase recovery and hosting history. Warnings are in-app only; no auto-debit or background notification delivery.
- `/shorts/studio/upload`: local preview, resumable encrypted-part upload, language, description, WebVTT and disclosures. Keep the page open during preparation. After interruption, reselect identical file/details within 24 hours.
- `/shorts/studio/video/:id`: scoped performance, private preview, visual labels and per-frame safety evidence, re-scan, content receipt, withdrawal and restriction appeal.
- `/shorts/studio/review`: operator-only media/reports/appeals, sampled-frame safety evidence, explicit full-video review for uncertain scans, reviewed topic corrections and decision history.

Playback measurement is off by default. Reach means distinct opted-in browsers, not people. Daily loops cannot inflate views; measurement excludes seek jumps and is bounded by duration and elapsed time. Turning collection off stops new events; deletion removes this browser's stored measurement records. Earlier legacy preview views are not backfilled into watch-time reports. At least five browsers are required for each discovery-source breakdown.

Follow/save/block preferences do not change the on-chain social graph or synchronize across devices. Published content metadata remains bound to its CID; editing a video or captions requires a new upload. Testnet financial flows remain unchanged. Run `npx vitest run src/features/shorts` for viewer, modal and ranking regressions.
