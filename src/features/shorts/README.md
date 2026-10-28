# Shorts testnet feature

Run `npm run start:shorts:testnet` and open `http://127.0.0.1:5180/shorts`. The command explicitly sets `ENABLE_SHORTS=true`. The script selects `ae_uat`; the feature uses the existing Superhero wallet providers and never imports test keys.

Start the separate Shorts API on loopback port 3334 using its `src/shorts/README.md`. Its testnet deployment supplies the ACI and contract identity. The API verifies the deployed bytecode before serving.

Watch freely and connect your testnet wallet to Like. Likes transfer zero tokens and create no creator or treasury reward. The user signs the Like contract call; Superhero pays the network fee through a separate PayingForTx envelope. Sponsorship requires an authenticated wallet session and is unavailable when the sponsor is disabled or its budget is exhausted. Connecting a wallet never automatically submits a Like.

Creator Studio shares the main wallet connection. In the explicit local connected-wallet demo mode, it opens an API session without an extra signature. Outside that mode, private creator access requires a signed challenge. Likes, comments and claims from earlier reward contracts use the wallet. Published Shorts and comments cannot be withdrawn or deleted. Publishing is paid for by Superhero and does not request a creator transaction.

Studio provides free publication, content management, on-chain earnings and claims, measured browser reach/watch time and verified transaction receipts. There are no creator hosting plans, top-ups, payment-source selectors or expiry dates. Content screening and feed eligibility remain separate from storage; the local demo can bypass scanning using the API's explicit demo flag.

The public feed uses reviewed topics, explicit interests, Superhero contract follows, language, recent watch quality, freshness and creator diversity. Watch quality blends watched fraction and completion over seven days, with a neutral score for new or small samples; Recent remains chronological. Follow/unfollow uses the same wallet-signed social contract and relationship cache as profiles; Following and For You use those relationships for the current feed's creators. Wallet switches select a separate relationship cache. Old browser-only follows are ignored, and resetting feed preferences never changes contract follows. An unavailable social API shows retry guidance; no local follow is substituted. Saved videos, interests, hidden creators and not-interested controls remain browser preferences. Payments never affect ranking. Creator-supplied captions are supported; playback uses prepared HLS segments. Official publication, discovery and playback all require the API content-policy checks. Unreviewed, failed or blocked scans do not grant public access. Published videos are shareable through `/shorts?short=<id>`, resolved separately from the ranked feed. The server denies ineligible shared links and media; a browser cover cannot override that decision. Withdrawn videos cannot be played or resolved by link. JEV is implemented as an optional server-side text suggestion adapter and stays disabled until configured. The sponsored Like flow currently supports testnet. Native mobile remains a separate integration.

## Wallet release verification

Set `VITE_SHORTS_RELEASE_HASH` at build time to the SHA-256 of the normalized,
reviewed API release manifest. Use the **Contract release identity** instructions
in the API's `src/shorts/README.md` to calculate it from the independently approved
file. This is a public configuration value, not a service key. Never generate or
accept this trust value from the public API response. Rebuild the website when
changing the release. An absent or mismatched hash disables Shorts wallet actions;
public browsing remains available.

The browser validates the release and ACI before enabling Likes. The reviewed
artifact must expose a nonpayable, stateful `like(string, int)` entrypoint with a
zero Like fee. Before signing, the client independently checks the node network,
deployed bytecode and current contract policy. Reads have per-request and total
time limits and a 1 MiB response limit. The connected SDK node must match the
configured origin. Account or node changes cancel the action.

A Like has amount zero and uses the network's inner-transaction signature domain.
The client bounds gas, gas price, fee and expiry before opening the wallet. The
API authenticates the caller, verifies the signed call and queues the exact bytes;
an isolated fee payer validates them again and submits the sponsored envelope.
The app never falls back to charging the user when sponsorship is unavailable.
The Like dialog and video details explain that Superhero covers the network fee.

The build-pinned release is still required for claims and other wallet actions.
These checks do not establish source reproducibility, an independent contract
audit or mainnet support.

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

Docker accepts `ENABLE_SHORTS`, `VITE_NETWORK`, `VITE_SHORTS_RELEASE_HASH`, `VITE_SHORTS_API_URL` and `VITE_SHORTS_STREAM_URL` as build arguments. CI reads `ENABLE_SHORTS` from its
repository variable (default false), with `DEV_ENABLE_SHORTS` for preview builds.
The existing prefixed build-argument collection accepts `VITE_SHORTS_RELEASE_HASH`
and the preview override `DEV_VITE_SHORTS_RELEASE_HASH`; both values are public
even when stored through that workflow’s secret collection.
For the Express server, also supply `VITE_SHORTS_API_URL` and `VITE_SHORTS_STREAM_URL`
at runtime so the CSP allows those origins. Other hosting providers must add their
exact origins to `connect-src` (HLS fetch) and keep `blob:` in `media-src`.

For hosted direct uploads, also set `SHORTS_UPLOAD_ORIGIN` on the Express server
to the API's public MinIO upload origin (for example `https://uploads.example.com`).
This adds that origin to CSP without exposing storage credentials. Other hosts
must add the same origin to `connect-src`. Configure storage CORS for the exact
website origin and deploy workers that understand `SHPRIV02` before enabling the
updated API. See the API's `src/shorts/DIRECT-UPLOADS.md` for the rollout guide.

## Immersive viewer

The consumer view shows one portrait video per viewport with vertical scroll snapping. Desktop has previous/next controls; touch screens use native vertical scrolling. Arrow keys navigate, Space/K toggles playback, and M toggles sound when a text field or control is not focused. Playback starts muted, pauses offscreen, pauses in hidden browser tabs and pauses while dialogs are open. Explicit user pauses survive closing an overlay.

The action rail opens the Like confirmation, copies a local deep link, or opens video details/reporting. A seek bar supports keyboard and pointer interaction. Seeking does not count toward the two-second preview view threshold. Discovery preferences are available through the For you menu; upload and creator Studio have separate routes from watching. Studio has its own sidebar and hides the global app sidebar/header; the main shell returns when leaving Studio.

Run the playback regression tests with `npm test -- --run src/features/shorts/__tests__/shorts-viewer.test.tsx`.


## Creator Studio

Creator API access is shared through an app-level Jotai session and cached in sessionStorage for the server-issued lifetime (currently 30 minutes). It is bound to the address, API origin, network and contract, survives route changes/reloads, and is cleared on expiry, server rejection, main-wallet disconnect or account changes even outside Shorts. Public viewing requires no private API session. Sponsored Likes use the same authenticated session and renew it when needed; sponsorship rejects the local connected-wallet authentication shortcut.

The composer has three numbered steps: **Video → Details → Review**. Previous/Next controls stay in the fixed bottom bar. Guests can choose a local video and enter details before connecting through Superhero's shared wallet dialog. Studio reuses the main sidebar's wallet component. The first connection preserves the guest draft; switching an existing account clears private composer state.

**Publish** starts resumable transfer, media preparation, IPFS verification and operator-funded registration. The review step and preview stay in place beneath a progress overlay. Successful publication offers Watch & share and Studio. Failures preserve the draft and resume the same upload/publication on retry. Publishing an existing private draft uses the same API operation. No creator payment or transaction signature is requested.

Hosted upload sessions advertise `direct-s3-v1`. The browser encrypts each 1 MiB
chunk using a key scoped to that object, then PUTs it to a short-lived MinIO URL.
Only metadata goes to the API. Storage receives no Studio bearer token or cookies.
The API verifies the stored checksum before acknowledging a chunk; workers verify
and decrypt the complete source. The local loopback demo keeps its original
transport. Expired permissions can be refreshed without starting a second upload.

Draft files/details remain in memory while staying in Shorts. After a reload, reselect identical file/details within 24 hours to resume an interrupted transfer. Uploaded private drafts remain in Studio. Changing prepared metadata creates a new draft; unchanged retries reuse the prepared video. Mobile has a collapsible preview and fixed Previous/Next controls.

- `/shorts/studio`: compact performance snapshot, latest uploads, live available rewards and contextual draft/review actions. Detailed reports remain in Analytics.
- `/shorts/studio/content`: searchable content library with publication filters (published/draft/withdrawn), sortable date/view/Like table headings and ten-item pagination. Each row links directly to its scoped analytics. Feed eligibility is shown separately from publication. Cards replace table rows on narrow screens; views show their selected period while Likes are all-time.
- `/shorts/studio/analytics`: Overview, Reach and Engagement sections with a shared 7/28/90-day UTC period. Metric selectors control one daily trend chart; a data table provides the underlying values. Reports include views/reach/watch time/average view duration/completion/earnings/Likes, prior-period comparisons when coverage permits, top Shorts, and privacy-suppressed discovery sources. Missing days remain gaps; creator accruals exclude wallet claims. Watch time displays seconds, minutes or hours as appropriate. The API exposes unrounded `watchHours = watchSeconds / 3600` for current, previous, daily and per-video summaries; Studio explains that watch time uses unique played segments from qualified daily views.
- `/shorts/studio/revenue`: live available rewards, lifetime earned/claimed balances, separate earlier rewards, claim review and dated verified activity. Activity can be filtered to earnings or claims; pending and stale history are explicit and do not alter the live balance.
- `/shorts/studio/upload`: local preview, resumable encrypted-part upload, language, description, WebVTT and disclosures. Keep the page open during preparation. After interruption, reselect identical file/details within 24 hours.
- `/shorts/studio/video/:id`: Details, Analytics and Revenue sections preserve the selected Short’s context. Details contains private preview, content receipt and restriction appeal; Analytics has scoped Overview/Reach/Engagement reports. Content links can open `?panel=analytics` directly.
- `/shorts/studio/review`: operator-only media/reports/appeals, sampled-frame safety evidence, explicit full-video review for uncertain scans, reviewed topic corrections and decision history.

Views, watch time and completion are counted automatically during actual playback, including for guests. There is no analytics opt-in in the feed menu; legacy saved measurement flags are ignored. Reach means distinct browsers, not people. A view qualifies after two seconds, at most once per browser/Short/UTC day. The viewer displays server-confirmed lifetime views. Repeated segments cannot inflate completion: measurement merges unique played intervals and excludes seeks, pauses, buffering and hidden playback. The server also bounds progress by duration and elapsed time. Heartbeats retry idempotently, and a final keepalive request flushes pending progress on page exit. The API's deletion endpoint removes retained browser measurement records and their view counts. Raw records expire after 90 days, while anonymous lifetime view totals persist. A 24-hour salted revocation digest rejects in-flight requests after deletion. Earlier legacy preview views are not backfilled into watch-time reports. At least five browsers are required for each discovery-source breakdown.

Save/block preferences remain browser-local; follows use the existing social contract. Published content metadata remains bound to its CID; editing a video or captions requires a new upload. Free Likes do not accrue rewards or apply a revenue split. Run `npx vitest run src/features/shorts` for viewer, modal and ranking regressions.

Measured HLS sessions bind a hash of the browser session to a short-lived playback
token. Each analytics send first obtains a no-store signed receipt from streaming;
only that receipt, the event and browser session go to the API. The API checks the
video/source/deployment/browser binding and caps progress by authorized segment
duration and elapsed time. The player sends no analytics before two seconds; the
signed session timestamp anchors the first qualifying event without a zero-second
write. Session renewal updates the delivery token while
keeping the daily event ID and progress. Playback still works without measurement
support, but unsigned events cannot add views. Measurements require Web Crypto
(HTTPS or loopback); receipts contain no raw browser identifier or wallet address.
Final page-exit reporting remains best effort because it needs two requests.
Audience metrics are estimates, not proof of human attention, and never authorize
rewards. Deploy the matching API and streaming protocol with this player.

Studio preserves the last successful report during background updates, exposes retry actions for unavailable data, and disables claims if the account balance refresh fails. Refresh requests both account and performance updates. No new wallet signing or authorization path is introduced.

## Comments

Comments are permanent public records on the current contract. The viewer can
publish a comment but cannot edit or delete it. New wallet deletion requests are
rejected before transaction preparation or signing. Previously signed transactions
from older deployments remain readable in wallet recovery; removing an app action
does not change an existing contract's bytecode.

## Playback service

Run `make start` in `superhero-video-streaming` alongside the API and IPFS. Feed records carry IDs and metadata. `shorts-media.ts` requests a short-lived HLS session; `use-short-hls.ts` attaches hls.js/MediaSource (`blob:`) or native HLS on supported Safari versions. Set `VITE_SHORTS_STREAM_URL` to the playback origin (default `http://127.0.0.1:3335`). Public bytes no longer go through the API. A background worker converts the private IPFS source once into a pinned 540p HLS rendition with two-second segments. Publication enqueues preparation, and existing videos need no re-upload. A video awaiting preparation shows “Preparing video.” Cache eviction only re-fetches prepared segments. The viewer mounts at most five nearby cards; the current and adjacent videos buffer a few seconds, while distant players unmount, abort requests and destroy their MediaSource. An authenticated edge shares immutable segment bytes across sessions after validating every request. Sessions renew before expiry while preserving position and explicit pauses. Temporary 429/503 responses on playback sessions, playlists and segments get at most two automatic retries, respecting Retry-After (seconds or HTTP date). Retries must start within 30 seconds; longer server delays and exhausted retries show Try again. Media retries reuse the same signed URL and byte range, preserve the player and its explicit pause, and cancel when it becomes cold or unmounts. Authentication and unavailable-content responses are not retried by this backpressure path; the existing one-time expired-link renewal remains separate. Native HLS uses the same session retry but its media loading is controlled by the browser. Other source failures show retry guidance, with no full-MP4 fallback. The previous `/videos/:id/video.mp4` endpoint returns 410. Upload object-URL previews and authenticated review previews keep their existing flow. HLS and signed URLs discourage direct-file links but are not DRM or download prevention. Run the HLS lifecycle/session tests with `npm test -- --run src/features/shorts/__tests__/shorts-hls.test.tsx`.


## Live indexing updates

Hosted Shorts subscribes to `shorts-updated` on its own `/shorts` namespace and
`/shorts/socket.io/` WebSocket transport, even when sharing the main API origin.
The reverse proxy must forward upgrades on that path (and strip any configured
public URL prefix). Token and social sockets remain independent. Shorts closes
its connection and retry timer when leaving the feature or changing deployment.
Events are checked against the configured network and contract, coalesced, and
refresh feed, balances and analytics. Admission failures and disconnections retry
with jittered exponential backoff, from 1.5–2 seconds up to 22.5–30 seconds.
Reconnect and returning to the tab refetch current state. A one-minute fallback
updates confirmations and off-chain analytics; the isolated local preview uses
a 20-second fallback. Mined Likes still animate immediately.

Hosted financial totals and daily charts use complete PostgreSQL aggregates.
The activity list shows up to 200 recent receipts and explicitly marks that limit.
Hosted playback totals and charts cover the complete owner library, with a
separate per-video breakdown capped at 100 entries. `videoBreakdown.complete`
identifies an incomplete breakdown. Missing video metrics display as unavailable
and cannot be used to sort the full content library; opening a video requests
its own report. Account totals never come from summing the bounded breakdown.

## Bounded feed loading

When the API advertises `catalogPaging`, the public viewer uses cursor pages and
refreshes only its loaded IDs through `/shorts/feed/state`. It keeps at most 60
metadata records, retains the active video during eviction and mounts at most five
video elements with at most three warm HLS players. Sorting and personal filters
apply to this candidate window. With `followingPaging`, Following gets chronological
pages from `/shorts/feed/following`, which selects across all followed creators'
eligible videos using the existing social-graph projection. It does not walk the
recent catalog to find matches. A wallet connection selects the account; no
signature is needed for this public read. Unsupported/unready Following shows a
retryable error instead of silently substituting recent videos.

Following uses `/shorts/feed/following/state` for its loaded window. Both endpoints
return an opaque membership revision. A changed revision restarts candidate loading,
including when the previous window was empty. Shared social-graph socket events
for the account and connection recovery trigger refresh; periodic/online refresh
also detects missed updates. Events that do not change membership leave the current
player and continuation intact. Current relationship reads still share the profile
cache and exclude blocks in both directions. When a creator enters the Following
window, their relationship is rechecked even if a profile or For You view recently
cached an exclusion. Ordinary metadata refreshes do not repeat that request.

Saved resolves browser bookmarks directly through `/shorts/feed/state`, in batches
of at most 20 IDs, independently of recent catalog pages. Up to 1,000 bookmarks
are kept locally, with the most recently saved IDs requested first. The API still
checks current publication and safety eligibility for every result. Missing,
withdrawn or restricted videos are skipped without deleting their bookmarks.
Changing the saved selection or entering/leaving Saved cancels the previous feed
request and resets its cursor; late responses cannot replace the new selection.

Each page has at most 20 candidates. Filtered or empty pages can have continuation;
automatic look-ahead stops after three pages for the same active video. The More
Shorts/Try again control allows explicit continuation. Refresh Shorts feed starts
from the latest page; periodic refresh updates current metadata without moving the
viewer to newer uploads. Failed reads keep the last window and cursor for retry.
Temporary 503 responses on these read-only page/state requests receive up to two
retries after one and two seconds. Backoff remains part of the single in-flight
request and is cancelled when the feed scope stops. Partial refresh batches are
never committed. Persistent failures and other statuses keep the explicit retry
flow; this behavior does not retry uploads, payments or other mutations.

Account/deployment changes create a new cursor scope, cancel pending reads and
ignore late responses. Confirmed Like feedback continues to bridge API lag. The
watching route does not load a private creator dashboard. Older API versions keep
the capped legacy feed response. Paged Studio data is described below.


## Paged Studio data

Hosted APIs advertise `studioPaging`. Studio then reads `/studio/summary` for live
account balance, complete library counts and the latest four Shorts; `/studio/content`
for a bounded page with server-side search/status/sort/period views; and
`/studio/video/:id` for direct access to older owned content. It never loads the
legacy full dashboard in this mode. Top performers use the bounded `topShorts`
metadata included in the analytics response, independent of the summary window.

The library uses Previous/Next cursors, resets on filters or period changes, and
shows whole-library status counts separately from the filtered result count. It
keeps one page in memory, debounces reads, aborts obsolete requests and hides data
from a previous wallet, deployment or period. An unavailable page has placeholders
and retry rather than a false empty-library message. Background refresh keeps the
last same-page result with an explicit error on failure. Index lag is shown because
publication status and Likes use confirmed plugin data, while wallet balances
are read separately. Local/older API config without the flag retains the capped
legacy dashboard. Test these paths with the Studio, session and Studio-read tests.

### Recovering wallet actions

Likes, comments and earlier reward claims save public action context in the browser's
`superhero-shorts-wallet-actions` IndexedDB database. The signing adapter verifies
the exact wallet, contract, amount and calldata before saving the signed hash and
nonce. Wallets may refresh the nonce; every other requested field must remain
unchanged. Sponsored signatures use the inner-transaction domain. Account
replacement, altered fields and ordinary user-paid Like signatures are rejected.

For sponsored Likes, the journal also stores the signed zero-value inner
transaction so a lost API response can be retried with exactly the same bytes and
request ID. No private key, seed or session token is stored. The submission
checkpoint is saved before entering the API boundary. Browser storage failure
prevents submission. A deliberate sponsorship retry authenticates again but never
asks the wallet to sign a replacement transaction.

After reload, the client observes status by the inner hash and verifies the
reported outer sponsored hash. Mounting, polling and recovery never sign or
submit automatically. Unknown, pending, mined and reorganized outcomes remain
unresolved. The client releases a request only after matching confirmed execution,
a durable pre-sign sponsorship rejection, or a canonical expiry proof after the
signed TTL plus three key blocks. A timeout or a missing node transaction alone
is insufficient. Expired signed envelopes and reserved sponsor costs remain in
the server journal.

Records are scoped by API, testnet, wallet and contract. Atomic browser updates
prevent duplicate admission across tabs. Browser clearing or eviction can remove
local records; they are not a cross-device lock. Three confirmations are not
absolute finality. Retained observations are rechecked after reorganization.
The server separately serializes payer nonces and enforces sponsorship budgets.

The journal and recovery-hook tests cover signatures, cancellation fencing,
interrupted submission, reload, account changes and mismatched observations.
The SDK tests run the real contract builder, dry-run, signing and validation with
an isolated simulated node transport. They do not broadcast funded transactions
or substitute for extension, deep-link and mobile wallet acceptance tests.
The extension-adapter tests additionally use AeSdkAepp, BrowserRuntimeConnection
and its actual RPC account over a simulated extension port, including sign-only
requests and user rejection. The port is simulated; no real extension is opened.

Historical withdrawal and comment-deletion journals remain readable so transactions signed against older deployments can be reconciled. The app never prepares new calls to those methods. Current free contracts have no claim endpoint; only verified earlier reward contracts can receive claims.
