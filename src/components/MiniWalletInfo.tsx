import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet, useWalletConnect } from '../hooks';
import Identicon from './Identicon';
import { AeButton } from './ui/ae-button';
import { cn } from '@/lib/utils';

type Props = { block?: boolean } & React.HTMLAttributes<HTMLDivElement>;

export default function MiniWalletInfo({ block, style, ...rest }: Props) {
  const { t } = useTranslation('common');
  const { disconnectWallet } = useWalletConnect()
  const { address, balance } = useWallet();

  if (!address) return null;

  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div
      {...rest}
      className={cn(
        "flex items-center gap-2",
        block && "p-3 rounded-full border border-border bg-card text-foreground",
        rest.className
      )}
      style={style}
    >
      <div className="w-6 h-6 rounded-full overflow-hidden">
        <Identicon address={address} size={24} />
      </div>
      <div className="grid leading-none">
        <div className="font-bold text-sm">{short}</div>
        <div className="text-xs text-muted-foreground">
          {Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AE
        </div>
      </div>
      <div className="ml-auto">
        <AeButton
          onClick={() => { disconnectWallet(); try { window.location.reload(); } catch {} }}
          variant="ghost"
          size="xs"
          className="h-8 px-2 border border-border/20 hover:bg-accent"
        >
          {t('buttons.logout')}
        </AeButton>
      </div>
    </div>
  );
}


