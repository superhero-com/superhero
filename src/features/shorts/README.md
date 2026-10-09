# Shorts testnet feature

Run `npm run start:shorts:testnet` and open `http://127.0.0.1:5180/shorts`. The command explicitly sets `ENABLE_SHORTS=true`. The script selects `ae_uat`; the feature uses the existing Superhero wallet providers and never imports test keys.

Start the separate Shorts API on loopback port 3334 using its `src/shorts/README.md`. Its testnet deployment supplies the ACI and contract identity. The API verifies the deployed bytecode before serving.

Watch freely and connect your testnet wallet to Like. A Like requires only its paid contract transaction; no message signature or API sign-in is requested. Public Like counts and creator revenue come from verified chain state/events. Connecting a wallet returns to the Like review and never automatically pays. Network and signer identity are checked before payments.

Creator Studio shares the main wallet connection. In the explicit local connected-wallet demo mode, it opens an API session without an extra signature. Outside that mode, private creator access requires a signed challenge. Paid Likes, reward claims and withdrawals always use the wallet. Publishing is paid for by Superhero and does not request a creator transaction.

Studio provides free publication, content management, on-chain earnings and claims, measured browser reach/watch time and verified transaction receipts. There are no creator hosting plans, top-ups, payment-source selectors or expiry dates. Content screening and feed eligibility remain separate from storage; the local demo can bypass scanning using the API's explicit demo flag.

The public feed uses reviewed topics, explicit interests, Superhero contract follows, language, recent watch quality, freshness and creator diversity. Watch quality blends watched fraction and completion over seven days, with a neutral score for new or small samples; Recent remains chronological. Follow/unfollow uses the same wallet-signed social contract and relationship cache as profiles; Following and For You use those relationships for the current feed's creators. Wallet switches select a separate relationship cache. Old browser-only follows are ignored, and resetting feed preferences never changes contract follows. An unavailable social API shows retry guidance; no local follow is substituted. Saved videos, interests, hidden creators and not-interested controls remain browser preferences. Payments never affect ranking. Creator-supplied captions are supported; playback uses prepared HLS segments. Actual sampled-frame visual screening runs locally before operator review; a failed/blocked scan prevents feed inclusion, not publication. Published videos are shareable through `/shorts?short=<id>`, resolved separately from the ranked feed. Feed-excluded and unreviewed videos open behind a blurred poster and warning; no video or audio loads until the viewer selects “View video.” They can hide it again. The cover is a viewing choice, not a private-media access boundary. Withdrawn videos cannot be played or resolved by link. JEV is implemented as an optional server-side text suggestion adapter and stays disabled until configured. The paid flow is a local web/testnet prototype and does not establish mobile-store payment approval. Native mobile remains a separate integration.

## Feature flag and staging configuration

Shorts is off by default in development and deployed builds. Set **`ENABLE_SHORTS=true`**
when building to include its route, desktop/mobile navigation and wallet session bridge.
Unset, `false`, `1` and other values stay disabled. Rebuild after changing it; setting
an environment variable only on an already-built static server cannot change its bundle.
No broad environment prefix is exposed to the browser.

Set `VITE_SHORTS_API_URL` to the staging API origin (without `/api/shorts`), and
`VITE_SHORTS_STREAM_URL` to the public HTTPS streaming origin. API defaults to the
normal configured API in deployed builds, and loopback port 3334 in development.
Set `VITE_NETWORK=ae_uat` for the current testnet contract. The API separately needs
`ENABLE_SHORTS=true`. Never put IPFS, moderation or streaming service keys in these variables.

Docker accepts the same three build arguments. CI reads `ENABLE_SHORTS` from its
repository variable (default false), with `DEV_ENABLE_SHORTS` for preview builds.
For the Express server, also supply `VITE_SHORTS_API_URL` and `VITE_SHORTS_STREAM_URL`
at runtime so the CSP allows those origins. Other hosting providers must add their
exact origins to `connect-src` (HLS fetch) and keep `blob:` in `media-src`.

## Immersive viewer

The consumer view shows one portrait video per viewport with vertical scroll snapping. Desktop has previous/next controls; touch screens use native vertical scrolling. Arrow keys navigate, Space/K toggles playback, and M toggles sound when a text field or control is not focused. Playback starts muted, pauses offscreen, pauses in hidden browser tabs and pauses while dialogs are open. Explicit user pauses survive closing an overlay.

The action rail opens the existing paid Like confirmation, copies a local deep link, or opens video details/reporting. A seek bar supports keyboard and pointer interaction. Seeking does not count toward the two-second preview view threshold. Discovery preferences are available through the For you menu; upload and creator Studio have separate routes from watching. Studio has its own sidebar and hides the global app sidebar/header; the main shell returns when leaving Studio.

Run the playback regression tests with `npm test -- --run src/features/shorts/__tests__/shorts-viewer.test.tsx`.


## Creator Studio

Creator API access is shared through an app-level Jotai session and cached in sessionStorage for the server-issued lifetime (currently 30 minutes). It is bound to the address, API origin, network and contract, survives route changes/reloads, and is cleared on expiry, server rejection, main-wallet disconnect or account changes even outside Shorts. Public viewing and paid Likes do not require this private API session. The API config selects either signed private sessions or the explicitly enabled local connected-wallet shortcut.

The composer has three numbered steps: **Video → Details → Review**. Previous/Next controls stay in the fixed bottom bar. Guests can choose a local video and enter details before connecting through Superhero's shared wallet dialog. Studio reuses the main sidebar's wallet component. The first connection preserves the guest draft; switching an existing account clears private composer state.

**Publish** starts resumable transfer, media preparation, IPFS verification and operator-funded registration. The review step and preview stay in place beneath a progress overlay. Successful publication offers Watch & share and Studio. Failures preserve the draft and resume the same upload/publication on retry. Publishing an existing private draft uses the same API operation. No creator payment or transaction signature is requested.

Draft files/details remain in memory while staying in Shorts. After a reload, reselect identical file/details within 24 hours to resume an interrupted transfer. Uploaded private drafts remain in Studio. Changing prepared metadata creates a new draft; unchanged retries reuse the prepared video. Mobile has a collapsible preview and fixed Previous/Next controls.

- `/shorts/studio`: compact performance snapshot, latest uploads, live available rewards and contextual draft/review actions. Detailed reports remain in Analytics.
- `/shorts/studio/content`: searchable content library with publication filters (published/draft/withdrawn), sortable date/view/paid-Like table headings and ten-item pagination. Each row links directly to its scoped analytics. Feed eligibility is shown separately from publication. Cards replace table rows on narrow screens; views show their selected period while paid Likes are all-time.
- `/shorts/studio/analytics`: Overview, Reach and Engagement sections with a shared 7/28/90-day UTC period. Metric selectors control one daily trend chart; a data table provides the underlying values. Reports include views/reach/watch time/average view duration/completion/earnings/paid Likes, prior-period comparisons when coverage permits, top Shorts, and privacy-suppressed discovery sources. Missing days remain gaps; creator accruals exclude wallet claims. Watch time displays seconds, minutes or hours as appropriate. The API exposes unrounded `watchHours = watchSeconds / 3600` for current, previous, daily and per-video summaries; Studio explains that watch time uses unique played segments from qualified daily views.
- `/shorts/studio/revenue`: live available rewards, lifetime earned/claimed balances, separate earlier rewards, claim review and dated verified activity. Activity can be filtered to earnings or claims; pending and stale history are explicit and do not alter the live balance.
- `/shorts/studio/upload`: local preview, resumable encrypted-part upload, language, description, WebVTT and disclosures. Keep the page open during preparation. After interruption, reselect identical file/details within 24 hours.
- `/shorts/studio/video/:id`: Details, Analytics and Revenue sections preserve the selected Short’s context. Details contains private preview, content receipt, withdrawal and restriction appeal; Analytics has scoped Overview/Reach/Engagement reports. Content links can open `?panel=analytics` directly.
- `/shorts/studio/review`: operator-only media/reports/appeals, sampled-frame safety evidence, explicit full-video review for uncertain scans, reviewed topic corrections and decision history.

Views, watch time and completion are counted automatically during actual playback, including for guests. There is no analytics opt-in in the feed menu; legacy saved measurement flags are ignored. Reach means distinct browsers, not people. A view qualifies after two seconds, at most once per browser/Short/UTC day. The viewer displays server-confirmed lifetime views. Repeated segments cannot inflate completion: measurement merges unique played intervals and excludes seeks, pauses, buffering and hidden playback. The server also bounds progress by duration and elapsed time. Heartbeats retry idempotently, and a final keepalive request flushes pending progress on page exit. The API's deletion endpoint removes retained browser measurement records and their view counts. Raw records expire after 90 days, while anonymous lifetime view totals persist. A 24-hour salted revocation digest rejects in-flight requests after deletion. Earlier legacy preview views are not backfilled into watch-time reports. At least five browsers are required for each discovery-source breakdown.

Save/block preferences remain browser-local; follows use the existing social contract. Published content metadata remains bound to its CID; editing a video or captions requires a new upload. Paid Likes and reward claims retain their 80/20 split. An upgrade shows earlier unclaimed rewards separately, with a wallet claim against the previous immutable contract. Run `npx vitest run src/features/shorts` for viewer, modal and ranking regressions.

Studio preserves the last successful report during background updates, exposes retry actions for unavailable data, and disables claims if the account balance refresh fails. Refresh requests both account and performance updates. No new wallet signing or authorization path is introduced.

## Playback service

Run `make start` in `superhero-video-streaming` alongside the API and IPFS. Feed records carry IDs and metadata. `shorts-media.ts` requests a short-lived HLS session; `use-short-hls.ts` attaches hls.js/MediaSource (`blob:`) or native HLS on supported Safari versions. Set `VITE_SHORTS_STREAM_URL` to the playback origin (default `http://127.0.0.1:3335`). Public bytes no longer go through the API. A background worker converts the private IPFS source once into a pinned 540p HLS rendition with two-second segments. Publication enqueues preparation, and existing videos need no re-upload. A video awaiting preparation shows “Preparing video.” Cache eviction only re-fetches prepared segments. The viewer mounts at most five nearby cards; the current and adjacent videos buffer a few seconds, while distant players unmount, abort requests and destroy their MediaSource. An authenticated edge shares immutable segment bytes across sessions after validating every request. Sessions renew before expiry while preserving position and explicit pauses. Source failures show retry guidance, with no full-MP4 fallback. The previous `/videos/:id/video.mp4` endpoint returns 410. Upload object-URL previews and authenticated review previews keep their existing flow. HLS and signed URLs discourage direct-file links but are not DRM or download prevention. Run the HLS lifecycle/session tests with `npm test -- --run src/features/shorts/__tests__/shorts-hls.test.tsx`.
