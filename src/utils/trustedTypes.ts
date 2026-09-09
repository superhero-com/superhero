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
// `require-trusted-types-for 'script'` guards TWO sink families, not one. Besides the HTML sinks
// above it guards TrustedScriptURL sinks — `ServiceWorkerContainer.register()`, `new Worker()`,
// `importScripts()`. A policy that implements only `createHTML` does not merely fail to protect
// those, it makes them THROW: Chrome raises `TypeError: … requires 'TrustedScriptURL' assignment
// and no 'default' policy for 'TrustedScriptURL' has been defined`. Both policies therefore also
// implement `createScriptURL`, restricted to same-origin URLs — first-party workers load, an
// injected cross-origin script URL still throws.
//
// Browsers without Trusted Types (Firefox, Safari) ignore `require-trusted-types-for`, so the
// raw string is already safe there and both helpers are no-ops.

const POLICY_NAME = 'superhero-dom';

const passthrough = (input: string): string => input;

// React builds every <script> element it renders by parsing this exact literal into a scratch
// <div> (`createInstance` in react-dom 19), so the element factory itself reaches the default
// policy like any other implicit sink. Dropping it leaves the div empty and React's very next
// statement — `div.removeChild(div.firstChild)` — throws `parameter 1 is not of type 'Node'`,
// which unmounts the whole app on every route that renders a <script> (the JSON-LD in
// src/seo/Head.tsx: token detail, post detail, profile). The literal is a constant with no
// attributes and no body, so parsing it yields an inert element; the src and text that would
// give it behaviour still go through createScriptURL and this policy respectively.
const REACT_SCRIPT_ELEMENT_FACTORY = '<script></script>';

// Implicit sinks only ever carry first-party CSS/text here (see `default` above). A string with
// no `<` cannot introduce an element or script, so it is safe to pass; drop anything else.
//
// A drop is SILENT to the CSP layer: the policy ran and returned a value, so no
// `securitypolicyviolation` event fires (measured, Chrome 2026-08). This warning is the only
// signal that markup vanished — e2e/csp.spec.ts fails the soak on it.
function denyMarkup(input: string): string {
  if (input.indexOf('<') === -1) return input;
  if (input === REACT_SCRIPT_ELEMENT_FACTORY) return input;
  // eslint-disable-next-line no-console
  console.warn('[trusted-types] dropped markup from an un-audited DOM sink');
  return '';
}

// Script URLs are same-origin only. Throwing (rather than returning '') is deliberate: an empty
// script URL resolves to the current document, which a worker would then try to execute.
function sameOriginScriptUrl(input: string): string {
  const { origin } = window.location;
  let resolved: URL;
  try {
    resolved = new URL(input, origin);
  } catch {
    throw new TypeError(`[trusted-types] refused an unparseable script URL: ${input}`);
  }
  if (resolved.origin !== origin) {
    throw new TypeError(`[trusted-types] refused a cross-origin script URL: ${input}`);
  }
  return resolved.href;
}

type DomPolicy = {
  createHTML: (input: string) => string;
  createScriptURL: (input: string) => string;
};

const factory = (globalThis as { trustedTypes?: TrustedTypePolicyFactory }).trustedTypes;
const ttEnabled = !!factory && typeof factory.createPolicy === 'function';

const policy: DomPolicy = ttEnabled
  ? (factory!.createPolicy(POLICY_NAME, {
    createHTML: passthrough,
    createScriptURL: sameOriginScriptUrl,
  }) as unknown as DomPolicy)
  : { createHTML: passthrough, createScriptURL: passthrough };

if (ttEnabled) {
  // Registering `default` makes the browser route every implicit sink through these callbacks.
  factory!.createPolicy('default', {
    createHTML: denyMarkup,
    createScriptURL: sameOriginScriptUrl,
  });
}

/**
 * Mint a value assignable to an innerHTML-class sink under the enforcing CSP. Returns a
 * `TrustedHTML` (typed as `string` for call-site ergonomics) where Trusted Types exists, and
 * the untouched string otherwise. Only ever pass first-party HTML — see the module header.
 */
export function trustedHtml(input: string): string {
  return policy.createHTML(input);
}

/**
 * Mint a value assignable to a script-URL sink (`serviceWorker.register`, `new Worker`) under the
 * enforcing CSP. Same-origin only; throws otherwise. Typed as `string` for call-site ergonomics.
 */
export function trustedScriptUrl(input: string): string {
  return policy.createScriptURL(input);
}
