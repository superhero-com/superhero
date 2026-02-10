import React from 'react';
import { useAeSdk } from '../hooks';
import { ConnectWalletButton } from './ConnectWalletButton';
import MiniWalletInfo from './MiniWalletInfo';

type Props = { label?: string; block?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>;

const WalletConnectBtn = ({
  label, block, style, ...rest
}: Props) => {
  const { activeAccount } = useAeSdk();
  if (activeAccount) {
    return <MiniWalletInfo block={block} style={style as any} />;
  }
  return (
    <ConnectWalletButton
      label={label}
      block={block}
      style={style}
      {...rest as any}
    />
  );
};

export default WalletConnectBtn;
