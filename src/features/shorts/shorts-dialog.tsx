import {
  useLayoutEffect, useRef, type CSSProperties, type ReactNode,
} from 'react';

import { useTransactionNotificationHost } from '@/features/transaction-notification';

export const ShortsDialog = ({
  label, busy, suspended = false, onClose, children, className = '', style,
}: {
  label: string;
  className?: string;
  style?: CSSProperties;
  busy: boolean;
  suspended?: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const setNotificationHost = useTransactionNotificationHost();
  useLayoutEffect(() => {
    const dialog = ref.current!;
    // Native dialogs make the rest of the document inert, including the app's
    // wallet confirmation portal. Release the top layer during wallet handoff.
    if (!suspended) { dialog.showModal(); setNotificationHost?.(dialog); }
    return () => {
      setNotificationHost?.((host) => (host === dialog ? null : host));
      dialog.close();
    };
  }, [suspended, setNotificationHost]);
  return (
    <dialog
      ref={ref}
      className={`sh-native-dialog ${className}`}
      style={style}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {children}
    </dialog>
  );
};
