import { Loader2, MessageCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { NostrLinkStatus } from './useNostrLinkCheck';

interface EnableChatDialogProps {
  status: NostrLinkStatus;
  onEnable: () => void;
  onDismiss: () => void;
}

/**
 * Web port of the app's `EnableChatSheet` bottom sheet — a centered dialog over
 * the repo's `@radix-ui/react-dialog` primitives. Visible while the shared
 * status atom is `'prompt'` or `'linking'`; closing while linking is blocked.
 */
export const EnableChatDialog = ({ status, onEnable, onDismiss }: EnableChatDialogProps) => {
  const isVisible = status === 'prompt' || status === 'linking';
  const isLinking = status === 'linking';

  return (
    <Dialog
      open={isVisible}
      onOpenChange={(open) => {
        if (!open && !isLinking) onDismiss();
      }}
    >
      <DialogContent
        hideClose={isLinking}
        className="max-w-sm"
        onInteractOutside={(event) => {
          if (isLinking) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (isLinking) event.preventDefault();
        }}
      >
        <div className="flex flex-col items-center gap-6 py-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>

          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl">Enable Chat</DialogTitle>
            <DialogDescription className="text-sm leading-5">
              Link your Nostr identity to your wallet so you can send and receive
              messages. This is a one-time registration.
            </DialogDescription>
          </DialogHeader>

          {isLinking ? (
            <div className="flex w-full items-center justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3">
              <Button size="lg" className="w-full rounded-full" onClick={onEnable}>
                Enable
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="w-full rounded-full text-muted-foreground"
                onClick={onDismiss}
              >
                Maybe later
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
