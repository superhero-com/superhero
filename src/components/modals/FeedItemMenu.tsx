import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import AeButton from '../AeButton';
import { Backend } from '../../api/backend';
import { useWallet } from '../../hooks';

interface FeedItemMenuProps {
  tipId?: string;
  postId?: string;
  url: string;
  author: string;
  children: React.ReactNode; // Trigger element
}

export default function FeedItemMenu({ tipId, postId, url, author, children }: FeedItemMenuProps) {
  const address = useWallet().address as string;
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const id = tipId || postId;

  const handlePin = async () => {
    setLoading(true);
    try {
      await Backend.pinItem(address, { url, tipId: id });
      alert('Pinned');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async () => {
    setLoading(true);
    try {
      await Backend.unPinItem(address, { url, tipId: id });
      alert('Unpinned');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reason.trim()) return;
    
    setLoading(true);
    try {
      await Backend.sendPostReport(address, { url, reason });
      alert('Reported');
      setReason('');
      setReportDialogOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[var(--secondary-color)] border-white/20" align="end">
          <DropdownMenuItem 
            onClick={handlePin}
            disabled={loading}
            className="text-white hover:bg-white/10 focus:bg-white/10"
          >
            📌 Pin Item
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleUnpin}
            disabled={loading}
            className="text-white hover:bg-white/10 focus:bg-white/10"
          >
            📌 Unpin Item
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/20" />
          <DropdownMenuItem 
            onClick={() => setReportDialogOpen(true)}
            className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
          >
            🚨 Report Item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--secondary-color)] border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Report Item</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason" className="text-sm text-gray-300">
                Reason for reporting
              </Label>
              <Input
                id="report-reason"
                placeholder="Enter reason for reporting this item"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
            
            <div className="flex gap-2 sm:gap-3 pt-4">
              <AeButton 
                onClick={() => setReportDialogOpen(false)}
                variant="secondary"
                className="flex-1 text-sm sm:text-base"
              >
                Cancel
              </AeButton>
              <AeButton
                onClick={handleReport}
                disabled={!reason.trim() || loading}
                loading={loading}
                variant="error"
                className="flex-1 text-sm sm:text-base"
              >
                {loading ? 'Reporting...' : 'Report'}
              </AeButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


