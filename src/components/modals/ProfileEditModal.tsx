import { useEffect, useRef, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { AccountsService } from "@/api/generated/services/AccountsService";

export default function ProfileEditModal({
  open,
  onClose,
  address,
  initialBio,
}: {
  open: boolean;
  onClose: () => void;
  address?: string;
  initialBio?: string;
}) {
  const { getProfile, canEdit } = useProfile(address);
  const { push } = useToast();
  const { sdk, activeAccount } = useAeSdk();
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const BIO_CHAR_LIMIT = 280;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Track which bio value we already selected for; ensures selection runs after async loads and on each open
  const selectedForBioRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    async function load() {
      if (!open) return;
      if (initialBio && initialBio.trim()) {
        setBio(initialBio.slice(0, BIO_CHAR_LIMIT));
        return;
      }
      try {
        const acct = await AccountsService.getAccount({ address: (address as string) || (activeAccount as string) });
        if (acct?.bio) {
          setBio(String(acct.bio));
          return;
        }
      } catch {}
      const p = await getProfile();
      setBio(p?.biography || "");
      setAvatarUrl(p?.avatar_url || "");
    }
    load();
  }, [open, address, getProfile, initialBio]);

  // Select entire bio when modal opens or when bio value changes and hasn't been selected yet
  useEffect(() => {
    if (!open) {
      selectedForBioRef.current = null;
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    if (selectedForBioRef.current === bio) return;
    // Defer to ensure dialog/content/value are mounted
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          el.focus();
          el.select();
          selectedForBioRef.current = bio;
        } catch {}
      }, 0);
    });
  }, [open, bio]);

  async function onSave() {
    try {
      const text = (bio || "").slice(0, BIO_CHAR_LIMIT).trim();
      if (!text) {
        // Do not enable loading state if validation fails
        push(<div style={{ color: "#ffb3b3" }}>Bio cannot be empty</div>);
        return;
      }
      setLoading(true);
      const contract = await sdk.initializeContract({
        aci: TIPPING_V3_ACI as any,
        address: CONFIG.CONTRACT_V3_ADDRESS as `ct_${string}`,
      });
      await contract.post_without_tip(text, ["bio-update", "hidden"]);
      // Optimistically update account bio in cache so UI reflects immediately
      const cacheKey = ["AccountsService.getAccount", (address as string) || (activeAccount as string)];
      queryClient.setQueryData(cacheKey, (prev: any) => ({ ...(prev || {}), bio: text }));
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
      <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] shadow-[var(--glass-shadow)]">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/80">Bio</Label>
            <Textarea
              ref={textareaRef as any}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_CHAR_LIMIT))}
              placeholder="Tell the world about you"
              className="mt-1 bg-white/7 border border-white/14 text-white rounded-xl focus:border-[#4ecdc4] focus:outline-none"
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
              {loading ? "Posting…" : "Post on-chain"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
