import { useLayoutEffect, useRef, type ReactNode } from 'react';

export const ShortsDialog = ({
  label, busy, suspended = false, onClose, children,
}: {
  label: string;
  busy: boolean;
  suspended?: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    // Native dialogs make the rest of the document inert, including the app's
    // wallet confirmation portal. Release the top layer during wallet handoff.
    if (!suspended) dialog.showModal();
    return () => dialog.close();
  }, [suspended]);
  return (
    <dialog
      ref={ref}
      className="sh-native-dialog"
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
