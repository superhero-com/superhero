import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useWallet } from '../../hooks';

interface TokenSelectProps {
  open: boolean;
  onSelect: (token: string) => void;
  onClose: () => void;
}

export default function TokenSelect({ open, onSelect, onClose }: TokenSelectProps) {
  const { tokenInfo } = useWallet();
  const tokens = Object.entries(tokenInfo || {});

  const handleSelect = (token: string) => {
    onSelect(token);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--secondary-color)] border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Select Token</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
          <Button
            variant="ghost"
            className="w-full justify-start text-left bg-white/5 hover:bg-white/10 text-white border border-white/10"
            onClick={() => handleSelect('native')}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-sm font-bold text-white">
                AE
              </div>
              <div>
                <div className="font-medium">#AE</div>
                <div className="text-xs text-gray-400">Native Token</div>
              </div>
            </div>
          </Button>

          {tokens.map(([address, info]: any) => (
            <Button
              key={address}
              variant="ghost"
              className="w-full justify-start text-left bg-white/5 hover:bg-white/10 text-white border border-white/10"
              onClick={() => handleSelect(address)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {info?.symbol?.slice(0, 2) || '??'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    #
                    {info?.symbol || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{address}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
