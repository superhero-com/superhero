import React from 'react';
import MiniWalletInfo from './MiniWalletInfo';
import ConnectWalletButton from './ConnectWalletButton';
import { useWallet } from '../hooks';

type Props = { label?: string; block?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function WalletConnectBtn({ label, block, style, ...rest }: Props) {
  const { address } = useWallet();
  if (address) {
    return <MiniWalletInfo block={block} style={style as any} />;
  }
  return (<ConnectWalletButton label={label} block={block} style={style} {...rest as any} />);
}


