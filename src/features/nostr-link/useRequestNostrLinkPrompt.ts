import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { nostrLinkStatusAtom } from './state';

/**
 * When mounted, forces the "Enable Chat" prompt to appear if the account is not
 * already linked. Use on screens where linking is required (e.g. the chat tab).
 *
 * Bypasses the 24h dismiss cooldown — the user explicitly navigated to a screen
 * that requires linking.
 */
export function useRequestNostrLinkPrompt() {
  const status = useAtomValue(nostrLinkStatusAtom);
  const setStatus = useSetAtom(nostrLinkStatusAtom);

  useEffect(() => {
    setStatus((prev) => (prev === 'done' || prev === 'error' ? 'prompt' : prev));
  }, [setStatus]);

  return status;
}
