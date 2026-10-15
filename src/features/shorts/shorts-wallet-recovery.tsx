import type { useShortsWalletTransactions } from './use-shorts-wallet-transactions';

export const ShortsWalletRecovery = ({
  recovery,
}: {
  recovery: ReturnType<typeof useShortsWalletTransactions>;
}) => {
  const { action, observation, error } = recovery;
  if (!action && !error) return null;
  const status = observation?.status;
  const terminal = status === 'confirmed' || status === 'failed';
  const unsent = !!action && (!action.tx || action.submission === 'prepared');
  const label = action
    && { paid_like: 'Your paid Like', claim: 'Your reward claim', withdraw: 'Your withdrawal' }[
      action.method
    ];
  let detail = 'Check your wallet activity before starting another payment.';
  if (action && !action.tx) detail = 'Waiting for your wallet. You can cancel this request before it is sent.';
  else if (action?.submission === 'prepared') detail = 'Signed and preparing to send. You can still cancel this request.';
  else if (status === 'confirmed') detail = 'Confirmed. Your wallet action is complete.';
  else if (status === 'failed') detail = 'The contract could not complete this action. A network fee may still apply.';
  else if (status === 'mined') detail = `Included in a block. Waiting for confirmation (${observation!.confirmations}/3).`;
  else if (action?.tx) {
    detail = status === 'reorged'
      ? 'The chain changed. We’re checking your transaction again; don’t send it twice.'
      : 'Your transaction is saved. We’re checking its outcome; you can keep browsing.';
  }
  return (
    <aside className="sh-wallet-recovery" aria-label="Wallet activity">
      <div role="status" aria-live="polite">
        <strong>{label || 'Wallet activity'}</strong>
        <p>{error || detail}</p>
      </div>
      {action?.tx && (
        <details>
          <summary>Transaction details</summary>
          <code>{action.tx}</code>
        </details>
      )}
      <div className="sh-wallet-recovery-actions">
        <button type="button" onClick={recovery.check}>
          Check status
        </button>
        {action && (unsent || terminal) && (
          <button type="button" onClick={recovery.release}>
            {unsent ? 'Cancel wallet request' : 'Done'}
          </button>
        )}
      </div>
    </aside>
  );
};
