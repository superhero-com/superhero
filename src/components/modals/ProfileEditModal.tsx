import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  const { getProfile, canEdit } = useProfile(address);
  const { push } = useToast();
  const { sdk, activeAccount } = useAeSdk();
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const BIO_CHAR_LIMIT = 280;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Track which bio value we already selected for; ensures selection runs after async loads and on each open
  const selectedOnceRef = useRef(false);
  const userTypedRef = useRef(false);
  const prefilledRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    async function load() {
      if (!open) return;
      if (initialBio && initialBio.trim() && !userTypedRef.current) {
        setBio(initialBio.slice(0, BIO_CHAR_LIMIT));
        prefilledRef.current = true;
        return;
      }
      try {
        const acct = await AccountsService.getAccount({ address: (address as string) || (activeAccount as string) });
        if (acct?.bio && !userTypedRef.current) {
          setBio(String(acct.bio));
          prefilledRef.current = true;
          return;
        }
      } catch {}
      const p = await getProfile();
      if (!userTypedRef.current) {
        setBio(p?.biography || "");
        setAvatarUrl(p?.avatar_url || "");
        prefilledRef.current = true;
      }
    }
    load();
  }, [open, address, getProfile, initialBio]);

  // Select entire bio once after it is prefilling and modal opens
  useEffect(() => {
    if (!open) {
      selectedOnceRef.current = false;
      prefilledRef.current = false;
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    if (selectedOnceRef.current || !prefilledRef.current) return;
    // Defer to ensure dialog/content/value are mounted
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          el.focus();
          el.select();
          selectedOnceRef.current = true;
        } catch {}
      }, 0);
    });
  }, [open]);

  async function onSave() {
    try {
      const text = (bio || "").slice(0, BIO_CHAR_LIMIT).trim();
      if (!text) {
        // Do not enable loading state if validation fails
        push(<div style={{ color: "#ffb3b3" }}>{t('messages.bioCannotBeEmpty')}</div>);
        return;
      }
      setLoading(true);
      const contract = await sdk.initializeContract({
        aci: TIPPING_V3_ACI as any,
        address: CONFIG.CONTRACT_V3_ADDRESS as `ct_${string}`,
      });
      const res: any = await contract.post_without_tip(text, ["bio-update", "hidden"]);
      // Notify listeners that a bio update post was submitted; parent can show a spinner and poll
      try {
        const evt = new CustomEvent("profile-bio-posted", {
          detail: {
            address: (address as string) || (activeAccount as string),
            bio: text,
            txHash: res?.hash || res?.transactionHash || res?.tx?.hash,
          },
        });
        window.dispatchEvent(evt);
      } catch {}
      push(<div>{t('messages.bioUpdateSubmitted')}</div>);
      onClose();
    } catch (e: any) {
      push(
        <div style={{ color: "#ffb3b3" }}>
          {e?.message || t('messages.failedToUpdateProfile')}
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
          <DialogTitle className="text-white">
            {bio && bio.trim() ? t('titles.editBio') : t('titles.addBio')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/80">{t('labels.bio')}</Label>
            <Textarea
              ref={textareaRef as any}
              value={bio}
              onChange={(e) => {
                try { userTypedRef.current = true; } catch {}
                const el = e.target as HTMLTextAreaElement;
                const prevPos = el.selectionStart || 0;
                const nextValue = el.value.slice(0, BIO_CHAR_LIMIT);
                setBio(nextValue);
                requestAnimationFrame(() => {
                  const ta = textareaRef.current;
                  if (!ta) return;
                  const pos = Math.min(prevPos, nextValue.length);
                  try { ta.setSelectionRange(pos, pos); } catch {}
                });
              }}
              placeholder={t('placeholders.bio')}
              className="mt-1 bg-white/7 border border-white/14 text-white rounded-xl focus:border-[#4ecdc4] focus:outline-none"
              maxLength={BIO_CHAR_LIMIT}
            />
            <div className="mt-1 text-white/50 text-xs text-right">{bio.length}/{BIO_CHAR_LIMIT}</div>
          </div>
          {/* Avatar editing temporarily disabled; keep existing avatar on save */}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={onSave} disabled={loading || !canEdit}>
              {loading ? t('messages.posting') : t('buttons.postOnChain')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
