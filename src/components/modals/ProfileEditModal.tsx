import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useProfile } from "../../hooks/useProfile";
import { useToast } from "../ToastProvider";
import { useAeSdk } from "@/hooks/useAeSdk";
// @ts-ignore
import TIPPING_V3_ACI from "tipping-contract/generated/Tipping_v3.aci.json";
import { CONFIG } from "@/config";

export default function ProfileEditModal({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address?: string;
}) {
  const { getProfile, canEdit } = useProfile(address);
  const { push } = useToast();
  const { sdk } = useAeSdk();
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const BIO_CHAR_LIMIT = 280;

  useEffect(() => {
    async function load() {
      if (!open) return;
      const p = await getProfile(address);
      setBio(p?.biography || "");
    }
    load();
  }, [open, address, getProfile]);

  async function onSave() {
    try {
      setLoading(true);
      const text = (bio || "").slice(0, BIO_CHAR_LIMIT).trim();
      if (!text) {
        push(<div style={{ color: "#ffb3b3" }}>Bio cannot be empty</div>);
        return;
      }
      const contract = await sdk.initializeContract({
        aci: TIPPING_V3_ACI as any,
        address: CONFIG.CONTRACT_V3_ADDRESS as `ct_${string}`,
      });
      await contract.post_without_tip(text, ["bio-update", "hidden"]);
      push(<div>Bio update submitted</div>);
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
              onChange={(e) => setBio(e.target.value.slice(0, BIO_CHAR_LIMIT))}
              placeholder="Tell the world about you"
              className="mt-1"
              maxLength={BIO_CHAR_LIMIT}
            />
            <div className="mt-1 text-white/50 text-xs text-right">{bio.length}/{BIO_CHAR_LIMIT}</div>
          </div>
          {/* Avatar editing temporarily disabled; keep existing avatar on save */}
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
