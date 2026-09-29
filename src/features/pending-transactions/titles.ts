import type { TFunction } from 'i18next';
import type { PendingTransaction } from './store';

/**
 * What a pending transaction is, in the words every screen uses for it:
 * "Creating #TOKEN", "Unlinking @handle…". `t` is bound to the `common`
 * namespace.
 */
export function pendingTransactionTitle(
  t: TFunction,
  transaction: Pick<PendingTransaction, 'kind' | 'meta'>,
): string {
  switch (transaction.kind) {
    case 'link_x':
      return t('transactionNotification.linkingXAccount');
    case 'unlink_x':
      return transaction.meta.username
        ? t('transactionNotification.unlinkingXHandle', { username: `@${transaction.meta.username}` })
        : t('transactionNotification.unlinkingXAccount');
    case 'create_token':
    default:
      return t('transactionNotification.creatingToken', { name: transaction.meta.tokenName ?? '' });
  }
}
