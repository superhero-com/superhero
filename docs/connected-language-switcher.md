# Connected language switcher continuation

Updated 2026-09-20. Reviewed implementation is on
`feat/connected-language-switcher`, based on `origin/develop` at
`0f06b8c730e836d9f6438fbbd8efdb05d5b4ddb1`.

## Recovered scope

- PR #701 (`bee90b28`): move the selector from the footer to the desktop sidebar
  and mobile header. Support Russian, Arabic, English, and Chinese in that order,
  with native-script labels. Retire German and French. Russian deliberately has
  curated chrome translations and English fallback for deeper content.
- PR #702 (`6ebece23`, stacked on #701): a content-language preference shared by
  Home Hot/Latest and the default Explore Posts tab. Default to the interface
  language; a separate All languages option clears the API filter without changing
  the interface. Global multi-category search retains its existing behavior.
- Follow-up browser feedback connects the Explore Tokens collection to the global
  language too: English selects WORDS, Chinese CHINESE, Russian RUSSIAN, and Arabic
  ARABIC. Explicit collection links and manual choices (including All) take
  precedence until the next global-language change.
- Shared delivery notes LX-1/LX-2/LX-3 and the API post-language DTO/detector confirm
  the scope. No product decision remains open.

The relevant old changes were inspected and applied as working-tree patches onto
current develop; locale keys were merged individually into current translations.
The merged profile implementation and its portfolio keys are preserved.

## Completed behavior and repaired gaps

- Header selectors work at desktop, tablet, and narrow mobile sizes; names retain
  their native script, the compact button announces the active language, and menu
  direction follows i18next. Arabic applies `lang=ar` and RTL to the document;
  the other three languages restore LTR.
- Interface choice persists under `lng`. Region-tagged browser/stored values are
  normalized; unsupported saved languages resolve to English.
- Content preference remains compatible with the original `{ ui, filter }` value
  under `postLanguageFilter`, now shared through Jotai. It survives navigation and
  reload, synchronizes content changes across tabs, handles invalid or blocked
  storage, and resets on every interface-language change. Returning to a prior UI
  language cannot resurrect its old override.
- All relevant requests and query keys include language, including Hot's latest
  backfill, pagination, and prefetch. Late responses cannot enter another locale's
  visible cache. Optimistic posts only enter a filtered cache when the API has
  supplied a matching language.
- Fixes the #702 review defect: untagged token-created/trade activity is included
  only with All languages, so it cannot hide an empty filtered Latest result.
- Hot waits for its backfill before showing empty content. Completed empty feeds
  stop showing indefinite skeletons. Empty filters offer All languages. Failures
  offer Retry and All languages, including Explore and failed Hot backfill.
- A server that ignores the language parameter is treated as a failed filtered
  request rather than showing incorrect posts or client-filtered pagination.
- Token collection selection and requests follow the interface language. Manual
  selection is recorded in the URL; changing the interface language clears that
  override while preserving other query parameters and loads the matching
  collection from its first page. The collection selector also follows RTL.

## Validation

- 105 focused tests passed across 13 files: locale normalization/direction/fallback,
  shared preference and storage failures, API language contract, Home and Explore
  transitions, late responses, errors/retry, composer cache eligibility, and profile
  regression tests, plus all four language-to-collection mappings and explicit
  collection/All overrides resetting on interface-language changes.
- `npm run check:types`: **95 errors, matching the existing baseline**; no increase.
- Targeted ESLint: no errors; existing long-line warnings in PostForm and TokenList.
- `npx vite build`: passed; existing large-chunk warning remains.
- `git diff --check`: passed.
- Real browser checks cover 320px and 390px mobile, 768px tablet, and desktop:
  supported options, Russian reload persistence, Arabic RTL/LTR transition, shared
  Home/Explore preference, live matching results, and Arabic empty-state recovery.
- Follow-up browser check: Chinese selects Chinese tokens; choosing All preserves
  Chinese UI; switching the global language to Russian selects Russian and clears
  the collection URL override.

The user supplied a development API for integration verification. Both latest and
popular post endpoints returned matching tags for English, Chinese, and Russian;
Arabic returned an empty result. The live preview uses that endpoint through an
**ignored `.env.local` override** of the existing `VITE_SUPERHERO_API_URL` setting.
The supplied hostname is absent from these code changes and this handoff.

The currently deployed production API does not yet support the feature: Popular
rejects the parameter and Latest ignores it. The user confirmed the API lane is
not merged yet. Coordinate its merge/deployment with the web release; this task
performed no API changes or deployment.

## Review and local preview

- Isolated checkout: this document's parent product repository.
- Preview: `http://127.0.0.1:5176/` (separate from the profile preview on port 5175).
- Existing PRs: https://github.com/superhero-com/superhero/pull/701 and
  https://github.com/superhero-com/superhero/pull/702. Both remain unchanged remotely.
- The user approved the preview and requested this branch be pushed on 2026-09-20.
  PR creation, merge, and publication remain outside this task's scope.
- Root docs migration, original web checkout, profile preview checkout, mobile
  product, and superproject submodule pointers were not modified.
