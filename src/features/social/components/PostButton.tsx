import React, { useState, useRef, useEffect } from 'react';
import { useAeSdk } from '../../../hooks/useAeSdk';
import PostForm from './PostForm';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import AddressAvatarWithChainNameFeed from '@/@components/Address/AddressAvatarWithChainNameFeed';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { cn } from '@/lib/utils';

interface PostButtonProps {
  onPostCreated?: () => void;
  onSuccess?: () => void;
  compact?: boolean;
}

export default function PostButton({ onPostCreated, onSuccess, compact = false }: PostButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const { activeAccount } = useAeSdk();
  const postFormRef = useRef<any>(null);

  const handleSuccess = () => {
    setExpanded(false);
    onSuccess?.();
  };

  const handlePostCreated = () => {
    onPostCreated?.();
  };

  // Auto-focus the textarea when expanded
  useEffect(() => {
    if (expanded && postFormRef.current) {
      setTimeout(() => {
        postFormRef.current?.focus?.({ immediate: true, preventScroll: false, scroll: 'start' });
      }, 100);
    }
  }, [expanded]);

  if (!activeAccount) {
    return (
      <GlassSurface className={cn(
        "relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] md:w-full md:mx-0 transition-colors",
        compact ? "px-2 pt-4 pb-5 md:p-3" : "p-4 md:p-5"
      )}>
        <div className={cn("flex items-start", compact ? "gap-1.5 md:gap-2" : "gap-3")}>
          <div className="flex-shrink-0 pt-0.5">
            <div className="md:hidden">
              <div className={cn("rounded-full bg-white/10 flex items-center justify-center", compact ? "w-[28px] h-[28px]" : "w-[36px] h-[36px]")}>
                <div className={cn("rounded-full bg-white/20", compact ? "w-5 h-5" : "w-6 h-6")}></div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className={cn("rounded-full bg-white/10 flex items-center justify-center", compact ? "w-[32px] h-[32px]" : "w-[40px] h-[40px]")}>
                <div className={cn("rounded-full bg-white/20", compact ? "w-5 h-5" : "w-6 h-6")}></div>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className={cn("text-white/60 leading-tight", compact ? "text-[13px]" : "text-sm")}>Connect your wallet to post</div>
            <ConnectWalletButton />
          </div>
        </div>
      </GlassSurface>
    );
  }

  if (expanded) {
    return (
      <PostForm
        ref={postFormRef}
        isPost={true}
        onClose={() => setExpanded(false)}
        onSuccess={handleSuccess}
        onPostCreated={handlePostCreated}
        showMediaFeatures={true}
        showEmojiPicker={true}
        showGifInput={true}
        characterLimit={280}
        autoFocus={true}
        compact={compact}
      />
    );
  }

  const accountAddress = activeAccount;

  return (
    <GlassSurface
      className={cn(
        "relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] md:w-full md:mx-0 transition-colors cursor-pointer",
        compact ? "px-2 pt-4 pb-5 md:p-3" : "p-4 md:p-5"
      )}
      onClick={() => setExpanded(true)}
      interactive={true}
    >
      <div className={cn("flex items-start", compact ? "gap-1.5 md:gap-2" : "gap-3")}>
        <div className="flex-shrink-0 pt-0.5">
          <div className="md:hidden">
            <AddressAvatarWithChainNameFeed address={accountAddress} size={compact ? 28 : 36} overlaySize={compact ? 12 : 16} showAddressAndChainName={false} />
          </div>
          <div className="hidden md:block">
            <AddressAvatarWithChainNameFeed address={accountAddress} size={compact ? 32 : 40} overlaySize={compact ? 14 : 20} showAddressAndChainName={false} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-white/60 leading-tight", compact ? "text-[13px]" : "text-sm")}>
            Share your thoughts...
          </div>
        </div>
      </div>
    </GlassSurface>
  );
}

