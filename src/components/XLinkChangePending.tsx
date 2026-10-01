import { useTranslation } from 'react-i18next';
import { PendingTransaction } from '@/features/pending-transactions/PendingTransaction';
import { pendingTransactionTitle } from '@/features/pending-transactions/titles';
import type { PendingXLinkChange } from '@/utils/confirmedXLink';

/**
 * An X link or unlink on its way, in the spot that would otherwise offer
 * "Link" or "Unlink" during the wait. The app-wide pending transaction card,
 * named for the change.
 */
export const XLinkChangePending = ({
  change,
  className,
}: {
  change: PendingXLinkChange;
  className?: string;
}) => {
  const { t } = useTranslation('common');
  const title = pendingTransactionTitle(t, {
    kind: change.kind === 'link' ? 'link_x' : 'unlink_x',
    meta: { username: change.username },
  });
  return (
    <PendingTransaction
      title={title}
      stage={change.step}
      startedAt={change.startedAt}
      className={className}
    />
  );
};

export default XLinkChangePending;
