/**
 * Edit-profile dialog (ported from the app's `edit-profile-dialog.tsx`). Updates
 * the user's own kind-0 profile (name / about / picture) and stamps the active æ
 * address into `aeAddress` — serialised to the `ae_address` wire field by
 * `ProfileService.updateMyProfile`, which publishes and caches it. Requires an
 * unlocked session (the publish path signs through the revocable identity).
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(profile?.name ?? '');
      setAbout(profile?.about ?? '');
      setPicture(profile?.picture ?? '');
      setError(null);
    }
  }, [open, profile]);

  const onSave = async () => {
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
      };
      if (activeAccount) updates.aeAddress = activeAccount;
      await profileService.updateMyProfile(updates);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
          {error && <p className="text-xs text-error">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
