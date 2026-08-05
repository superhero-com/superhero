// Trusted Types policies for the enforcing CSP (server/index.cjs sets `require-trusted-types-for
// 'script'; trusted-types superhero-dom default`). Two policies, one trust boundary:
//
//   superhero-dom  The audited first-party writer. `trustedHtml()` routes every sink WE own
//                  through it: avatar SVGs from jdenticon / multiavatar, i18n copy with a
//                  `**bold**` transform, and linkify's entity-decode textarea. These inputs are
//                  provably not raw feed content, so the policy passes them through unchanged;
//                  the guarantee it buys is that only these audited call sites can write markup.
//
//   default        A deny-markup safety net for the implicit string sinks we do NOT own — most
//                  notably @radix-ui/react-select, which injects a static scrollbar stylesheet
//                  through React's string `dangerouslySetInnerHTML` (a `<style>` sink we cannot
//                  wrap in node_modules). Markup-free strings (CSS, plain text) pass; anything
//                  containing a tag is dropped to '', so an un-audited or injected markup string
//                  reaching an implicit sink renders as nothing instead of executing.
//
// Naming both — and nothing else — in the `trusted-types` directive also forbids an injected
// script from minting its own pass-through policy.
//
// Browsers without Trusted Types (Firefox, Safari) ignore `require-trusted-types-for`, so the
// raw string is already safe there and `trustedHtml` is a no-op.

const POLICY_NAME = 'superhero-dom';

const passthrough = (input: string): string => input;

// Implicit sinks only ever carry first-party CSS/text here (see `default` above). A string with
// no `<` cannot introduce an element or script, so it is safe to pass; drop anything else.
function denyMarkup(input: string): string {
  if (input.indexOf('<') === -1) return input;
  // eslint-disable-next-line no-console
  console.warn('[trusted-types] dropped markup from an un-audited DOM sink');
  return '';
}

const factory = (globalThis as { trustedTypes?: TrustedTypePolicyFactory }).trustedTypes;
const ttEnabled = !!factory && typeof factory.createPolicy === 'function';

const policy: { createHTML: (input: string) => string } = ttEnabled
  ? (factory!.createPolicy(POLICY_NAME, { createHTML: passthrough }) as unknown as {
    createHTML: (input: string) => string;
  })
  : { createHTML: passthrough };

if (ttEnabled) {
  // Registering `default` makes the browser route every implicit string sink through denyMarkup.
  factory!.createPolicy('default', { createHTML: denyMarkup });
}

/**
 * Mint a value assignable to an innerHTML-class sink under the enforcing CSP. Returns a
 * `TrustedHTML` (typed as `string` for call-site ergonomics) where Trusted Types exists, and
 * the untouched string otherwise. Only ever pass first-party HTML — see the module header.
 */
export function trustedHtml(input: string): string {
  return policy.createHTML(input);
}
