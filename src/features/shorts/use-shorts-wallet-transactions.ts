import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { Contract } from '@aeternity/aepp-sdk';
import { request, SHORTS_API } from './api';
import {
  WalletJournal,
  assertUnsignedWalletRequest,
  validateObservation,
  type WalletAction,
  type WalletMethod,
  type WalletObservation,
  type WalletScope,
} from './shorts-wallet-journal';
import { verifyShortsWalletTarget } from './shorts-release';
import type { Config } from './types';

export class WalletActionPending extends Error {}
const journal = new WalletJournal();
export const observeWalletAction = async (action: WalletAction, signal?: AbortSignal) => {
  const params = new URLSearchParams({ address: action.address, contract: action.contract });
  const value = await request<unknown>(
    `/wallet-transactions/${encodeURIComponent(action.tx!)}?${params}`,
    undefined,
    undefined,
    { signal, timeout: 20000 },
  );
  return validateObservation(action, value);
};

type WalletSdk = { address: string; getContext: () => Parameters<typeof Contract.initialize>[0] };
type Options = {
  actor: string;
  network?: string;
  contract?: string;
  previousContract?: string;
  onConfirmed: (action: WalletAction) => void;
  onUnconfirmed?: (action: WalletAction) => void;
};

/** Resume observations only. Neither mounting, polling nor recovery can sign. */
export function useShortsWalletTransactions(options: Options) {
  const {
    actor, network, contract, previousContract,
  } = options;
  const scopeKey = JSON.stringify([SHORTS_API, actor, network, contract, previousContract]);
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  const confirmed = useRef(new Set<string>());
  const onConfirmed = useRef(options.onConfirmed);
  onConfirmed.current = options.onConfirmed;
  const onUnconfirmed = useRef(options.onUnconfirmed);
  onUnconfirmed.current = options.onUnconfirmed;
  const [state, setState] = useState<{
    scope: string;
    action?: WalletAction;
    observation?: WalletObservation;
    error?: string;
  }>({ scope: '' });
  const [revision, setRevision] = useState(0);
  const check = useCallback(() => setRevision((value) => value + 1), []);
  const scopes: WalletScope[] = actor && network && contract
    ? [...new Set([contract, previousContract].filter((s): s is string => !!s))].map(
      (address) => ({
        api: SHORTS_API,
        address: actor,
        network,
        contract: address,
      }),
    )
    : [];
  const latestScopes = useRef(scopes);
  latestScopes.current = scopes;

  useEffect(() => {
    currentScope.current = scopeKey;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const load = async () => {
      try {
        // At most the current and configured previous contract; no global scan.
        const saved = await Promise.all(latestScopes.current.map((scope) => journal.read(scope)));
        const action = saved.find((row) => !!row);
        if (!live) return;
        if (!action) {
          setState({ scope: scopeKey });
          return;
        }
        setState((old) => ({
          scope: scopeKey,
          action,
          observation: old.action?.id === action.id ? old.observation : undefined,
        }));
        if (!action.tx || action.submission === 'prepared' || document.visibilityState === 'hidden') return;
        const observation = await observeWalletAction(action, controller.signal);
        if (!live || currentScope.current !== scopeKey) return;
        setState({ scope: scopeKey, action, observation });
        if (observation.status !== 'confirmed' && confirmed.current.delete(action.tx)) {
          onUnconfirmed.current?.(action);
        }
        if (observation.status === 'confirmed' && !confirmed.current.has(action.tx)) {
          confirmed.current.add(action.tx);
          if (confirmed.current.size > 32) {
            confirmed.current.delete(confirmed.current.values().next().value!);
          }
          onConfirmed.current(action);
        }
      } catch {
        if (live) {
          setState((old) => ({
            ...(old.scope === scopeKey ? old : {}),
            scope: scopeKey,
            observation: undefined,
            error: 'Could not check wallet activity. Keep any pending payment and check again.',
          }));
        }
      } finally {
        if (live) timer = setTimeout(load, 10000);
      }
    };
    load();
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
      if (currentScope.current === scopeKey) currentScope.current = '';
    };
  }, [scopeKey, revision]);
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState !== 'hidden') check();
    };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [check]);

  const run = async (
    sdk: WalletSdk,
    method: WalletMethod,
    videoId: string | undefined,
    amount: string,
    config: Config,
    target: string,
    onSigned: () => void,
  ) => {
    const expectedScope = scopeKey;
    const context = sdk.getContext();
    const scope = latestScopes.current.find((s) => s.contract === target);
    const assertCurrent = () => {
      if (!scope || currentScope.current !== expectedScope || sdk.address !== actor
        || sdk.getContext().onNode !== context.onNode) throw new Error('Wallet changed. This request will not be sent.');
    };
    assertCurrent();
    // Reconcile all supported Shorts contracts before another action for this wallet.
    await latestScopes.current.reduce(async (previous, candidate) => {
      await previous;
      const pending = await journal.read(candidate);
      assertCurrent();
      if (pending) {
        if (!pending.tx || pending.submission === 'prepared') {
          throw new WalletActionPending(
            'A wallet request is already waiting. Finish or cancel it before trying again.',
          );
        }
        const observation = await observeWalletAction(pending);
        assertCurrent();
        if (!['confirmed', 'failed'].includes(observation.status)) {
          throw new WalletActionPending(
            'Your earlier transaction is still pending. Check its status instead of sending it again.',
          );
        }
        await journal.finish(pending, observation);
      }
    }, Promise.resolve());
    const verified = await verifyShortsWalletTarget(context, config, target, method, amount, assertCurrent);
    assertCurrent();
    const action = await journal.begin({
      ...scope!,
      method,
      videoId,
      amount,
    });
    check();
    let signed = false;
    try {
      const signer = context.onAccount;
      if (!signer || typeof signer === 'string' || typeof signer.signTransaction !== 'function') throw new Error('Your wallet signer is unavailable.');
      const node = context.onNode;
      if (!node) throw new Error('Your wallet connection is unavailable.');
      const submissionNode = new Proxy(node, {
        get: (targetNode, key) => {
          if (key === 'postTransaction') {
            return async (...args: Parameters<typeof node.postTransaction>) => {
              assertCurrent();
              await journal.attemptSubmission(action, args[0].tx as `tx_${string}`);
              assertCurrent();
              // Never clear the record after entering this boundary, even when
              // the transport rejects: the node may already have accepted it.
              return node.postTransaction(...args);
            };
          }
          const value = Reflect.get(targetNode, key, targetNode);
          return typeof value === 'function' ? value.bind(targetNode) : value;
        },
      });
      const wrapped = new Proxy(signer, {
        get: (account, key) => {
          if (key === 'signTransaction') {
            return async (...args: Parameters<typeof signer.signTransaction>) => {
              assertCurrent();
              const current = await journal.read(scope!);
              if (current?.id !== action.id || current.tx) throw new Error('This wallet request is no longer active.');
              assertCurrent();
              assertUnsignedWalletRequest(action, args[0], args[1]?.networkId || '');
              const raw = await signer.signTransaction(...args);
              assertCurrent();
              await journal.signed(action, args[0], raw, args[1]?.networkId || '');
              signed = true;
              check();
              onSigned();
              // No raw bytes reach SDK submission until the IndexedDB transaction commits.
              return raw;
            };
          }
          const value = Reflect.get(account, key, account);
          return typeof value === 'function' ? value.bind(account) : value;
        },
      });
      const call = await Contract.initialize({
        ...context,
        onNode: submissionNode,
        onAccount: wrapped,
        aci: verified.aci as any,
        address: target as `ct_${string}`,
      });
      assertCurrent();
      await call.$call(method, method === 'claim' ? [] : [videoId], { amount, waitMined: false });
      if (!signed) {
        throw new Error(
          'The wallet returned without a saved transaction. Check your wallet history.',
        );
      }
    } catch (error) {
      // A signature alone is not a submission. Release only when the durable
      // boundary proves SDK verification never reached postTransaction.
      const cancelled = await journal.cancelUnsent(action).then(() => true, () => false);
      if (cancelled) throw error;
      if (!signed) {
        throw error;
      }
      throw new WalletActionPending(
        'Your signed transaction is saved. Its outcome is not confirmed yet; check its status before another payment.',
      );
    } finally {
      check();
    }
    throw new WalletActionPending(
      'Transaction sent. Waiting for confirmation. You can keep browsing.',
    );
  };

  const action = state.scope === scopeKey ? state.action : undefined;
  const release = async () => {
    if (!action) return;
    try {
      if (action.tx && action.submission !== 'prepared') {
        await journal.finish(action, await observeWalletAction(action));
      } else await journal.cancelUnsent(action);
    } catch (error) {
      if (currentScope.current === scopeKey) {
        setState((old) => ({
          ...old,
          error: error instanceof Error ? error.message : 'Check wallet activity again.',
        }));
      }
    } finally {
      check();
    }
  };
  return {
    action,
    observation: state.scope === scopeKey ? state.observation : undefined,
    error: state.scope === scopeKey ? state.error : undefined,
    check,
    release,
    run,
  };
}
