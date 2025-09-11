import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Identicon from '../Identicon';

interface UserPopupProps {
  address: string;
  open: boolean;
  onClose: () => void;
}

export default function UserPopup({ address, open, onClose }: UserPopupProps) {
  const [profile, setProfile] = useState<any>(null);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--secondary-color)] border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">User Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src="" alt={address} />
              <AvatarFallback className="bg-transparent p-0">
                <Identicon address={address} size={56} />
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">
                {profile?.preferredChainName || 'Legend'}
              </div>
              <div className="text-xs text-gray-300 break-all">
                {address}
              </div>
              {profile?.location && (
                <div className="text-xs text-gray-300 mt-1">
                  {profile.location}
                </div>
              )}
            </div>
          </div>
          
          {profile?.biography && (
            <div className="text-xs text-gray-300 whitespace-pre-wrap bg-white/5 rounded-lg p-3">
              {profile.biography}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


