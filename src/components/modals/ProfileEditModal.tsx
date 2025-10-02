import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useProfile } from "../../hooks/useProfile";
import { useToast } from "../ToastProvider";
import { useAeSdk } from "@/hooks/useAeSdk";
import { Backend } from "@/api/backend";

export default function ProfileEditModal({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address?: string;
}) {
  const { getProfile, setProfile, canEdit, isConfigured } = useProfile(address);
  const { push } = useToast();
  const { activeAccount } = useAeSdk();
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!open) return;
      const p = await getProfile(address);
      setBio(p?.biography || "");
      setAvatar(p?.avatar_url || "");
    }
    load();
  }, [open, address, getProfile]);

  async function onSave() {
    try {
      setLoading(true);
      if (isConfigured) {
        const hash = await setProfile({ biography: bio, avatar_url: avatar });
        if (hash) {
          push(
            <div>
              <div>Profile update submitted</div>
            </div>
          );
        }
      } else {
        const target = address || activeAccount;
        await Backend.sendProfileData(target as string, {
          biography: bio,
          avatar_url: avatar,
        });
        push(<div>Profile updated</div>);
      }
      onClose();
    } catch (e: any) {
      push(
        <div style={{ color: "#ffb3b3" }}>
          {e?.message || "Failed to update profile"}
        </div>
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--secondary-color)] border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/80">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world about you"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-white/80">Avatar URL</Label>
            <Input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={loading || !canEdit}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
