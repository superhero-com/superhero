import React from 'react';
import { useSelector } from 'react-redux';
import MiniWalletInfo from './MiniWalletInfo';
import ConnectWalletButton from './ConnectWalletButton';

type Props = { label?: string; block?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function WalletConnectBtn({ label, block, style, ...rest }: Props) {
  const address = useSelector((s: any) => s.root.address as string | null);
  if (address) {
    return <MiniWalletInfo block={block} style={style as any} />;
  }
  return (<ConnectWalletButton label={label} block={block} style={style} {...rest as any} />);
}


