import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { Check, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../ui/dialog';

interface EditSuperheroIdModalProps {
  open: boolean;
  onClose: () => void;
  address: string;
  chainName?: string | null;
}

const EditSuperheroIdModal = ({
  open,
  onClose,
  address,
  chainName,
}: EditSuperheroIdModalProps) => {
  const { t } = useTranslation('common');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [xConnected, setXConnected] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={[
            'w-[95vw] max-w-sm mx-auto p-0 overflow-hidden border-0 bg-transparent shadow-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          ].join(' ')}
        >
          {/* Glass card */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Subtle top highlight */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
            />
            {/* Neon glow blob */}
            <div
              className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, var(--neon-teal) 0%, transparent 70%)', filter: 'blur(32px)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <DialogHeader>
                <DialogTitle className="text-white font-bold text-base tracking-tight">
                  Edit Superhero ID
                </DialogTitle>
              </DialogHeader>

            </div>

            <div className="px-5 pb-5 pt-4 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-2xl opacity-60 blur-xl"
                    style={{ background: 'var(--neon-teal)' }}
                  />
                  <AddressAvatarWithChainName
                    address={address}
                    size={72}
                    showAddressAndChainName={false}
                    className="relative"
                  />
                </div>
              </div>

              {/* Chain name */}
              <div>
                <Label className="text-white/70 text-[11px] tracking-wider font-semibold">
                  .chain name
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2 min-w-0">
                    {chainName ? (
                      <>
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--neon-teal)' }}
                        >
                          {chainName.endsWith('.chain') ? chainName : `${chainName}.chain`}
                        </span>
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--neon-teal)' }} />
                      </>
                    ) : (
                      <span className="text-sm text-white/40 italic">SuperheroUser.chain</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="shrink-0 rounded-xl px-3 py-2 text-[12px] font-semibold border border-solid transition-colors whitespace-nowrap"
                    style={{
                      background: 'rgba(0,255,157,0.1)',
                      borderColor: 'rgba(0,255,157,0.35)',
                      color: 'var(--neon-teal)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,157,0.18)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,157,0.1)';
                    }}
                  >
                    {chainName ? 'Change' : 'Buy name'}
                  </button>
                </div>
              </div>

              {/* Connect X */}
              <div>
                <Label className="text-white/70 text-[11px] uppercase tracking-wider font-semibold">
                  X (Twitter)
                </Label>
                {xConnected ? (
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2">
                    <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--neon-teal)' }} />
                    <span className="text-sm text-white/90">@connected</span>
                    <button
                      type="button"
                      className="ml-auto text-[11px] text-white/40 hover:text-white/70 transition-colors"
                      onClick={() => setXConnected(false)}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setXConnected(true)}
                    className="mt-1.5 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-2.5 text-sm text-white/60 hover:text-white hover:border-white/40 hover:bg-white/[0.04] transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.734l7.73-8.835L1.254 2.25H8.08l4.264 5.634zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Link account
                  </button>
                )}
              </div>

              {/* Website */}
              <div>
                <Label className="text-white/70 text-[11px] uppercase tracking-wider font-semibold">
                  Website
                </Label>
                <div className="relative mt-1.5">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yoursite.com"
                    className="pl-8 bg-white/[0.06] border border-white/12 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)] placeholder:text-white/30 text-sm"
                    maxLength={200}
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label className="text-white/70 text-[11px] uppercase tracking-wider font-semibold">
                  Bio
                </Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the world about yourself…"
                  className="mt-1.5 bg-white/[0.06] border border-white/12 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)] placeholder:text-white/30 text-sm resize-none min-h-[72px]"
                  maxLength={280}
                />
                <div className="mt-1 text-right text-[10px] text-white/35">
                  {bio.length}
                  /280
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 rounded-xl font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-teal) 0%, #00c97e 100%)',
                    color: '#0a0a0a',
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chain name claiming sub-modal */}

    </>
  );
};

export default EditSuperheroIdModal;
