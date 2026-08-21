/**
 * Edit-profile dialog (ported from the app's `edit-profile-dialog.tsx`). Updates
 * the user's own kind-0 profile (name / about / picture). Publishing the active æ
 * address into `aeAddress` is an explicit, confirmed choice: the user opts in, then
 * confirms in a second dialog showing the exact address before it is published to
 * public relays (the confirm-and-review shape from the app's
 * `transaction-sign-dialog.tsx`). Leaving the choice off clears any previously
 * published address from future updates. Requires an unlocked session (the publish
 * path signs through the revocable identity).
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccount } from '@/hooks';

import { useChat } from '../hooks/useChat';
import type { Profile } from '../core/types';

export interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProfileDialog = ({ open, onOpenChange }: EditProfileDialogProps) => {
  const { profile, profileService } = useChat();
  const { activeAccount } = useAccount();

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [picture, setPicture] = useState('');
  const [shareAddress, setShareAddress] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The address that would be published: the unlocked account, or — so a locked
  // session can still toggle the choice off — the one already on the profile.
  const publishableAddress = activeAccount ?? profile?.aeAddress ?? '';

  useEffect(() => {
    if (open) {
      setName(profile?.name ?? '');
      setAbout(profile?.about ?? '');
      setPicture(profile?.picture ?? '');
      setShareAddress(!!profile?.aeAddress);
      setConfirmOpen(false);
      setError(null);
    }
  }, [open, profile]);

  const commit = async () => {
    if (!profileService) {
      setError('Chat is not ready — unlock chat first.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updates: Partial<Profile> = {
        name: name.trim(),
        about: about.trim(),
        picture: picture.trim(),
        // Publish the æ address only on an explicit choice; otherwise clear it so a
        // previously published address stops going out on future profile updates.
        aeAddress: shareAddress ? publishableAddress : undefined,
      };
      await profileService.updateMyProfile(updates);
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSave = () => {
    // Opting to publish the address needs an explicit confirm; turning it off does not.
    if (shareAddress && publishableAddress) {
      setConfirmOpen(true);
      return;
    }
    commit();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit chat profile</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="chat-profile-name">Name</Label>
              <Input
                id="chat-profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                maxLength={50}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="chat-profile-about">About</Label>
              <Textarea
                id="chat-profile-about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="A short bio"
                maxLength={500}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="chat-profile-picture">Picture URL</Label>
              <Input
                id="chat-profile-picture"
                value={picture}
                onChange={(e) => setPicture(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="chat-profile-share-ae"
                className="mt-0.5"
                checked={shareAddress}
                onCheckedChange={(v) => setShareAddress(v === true)}
                disabled={isSaving || !publishableAddress}
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="chat-profile-share-ae" className="leading-snug">
                  Show my æternity address on my public profile
                </Label>
                <p className="text-xs text-muted-foreground">
                  {publishableAddress
                    ? 'Others in chat can see and tip your wallet. You’ll confirm before it’s published.'
                    : 'Unlock your wallet to share your æternity address.'}
                </p>
              </div>
            </div>
            {error && <p className="text-xs text-error">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving && !confirmOpen ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!isSaving) setConfirmOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publish your æternity address?</DialogTitle>
            <DialogDescription>
              This adds your æternity address to your public chat profile. Anyone on the
              network can see it, and copies already sent to relays cannot be recalled.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Address to publish</p>
            <p className="mt-1 break-all font-mono text-sm">{publishableAddress}</p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isSaving}>
              Back
            </Button>
            <Button onClick={() => commit()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : 'Confirm & publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
