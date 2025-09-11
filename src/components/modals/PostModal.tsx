import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useBackend, useWallet } from '../../hooks';
import AeButton from '../AeButton';

interface PostModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PostModal({ open, onClose }: PostModalProps) {
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState('');
  const [loading, setLoading] = useState(false);
  const { address } = useWallet();
  const { callWithAuth } = useBackend();
  
  const handlePost = async () => {
    setLoading(true);
    try {
      if (!address) { 
        alert('Please connect a wallet first.'); 
        return; 
      }
      await callWithAuth({ 
        method: 'sendPostWithoutTip' as any, 
        arg: { title, media } 
      });
      setTitle('');
      setMedia('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--secondary-color)] border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Create Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="post-title" className="text-sm text-gray-300">
              Title
            </Label>
            <Input
              id="post-title"
              placeholder="Enter post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="post-media" className="text-sm text-gray-300">
              Media URL (optional)
            </Label>
            <Input
              id="post-media"
              placeholder="https://example.com/image.jpg"
              value={media}
              onChange={(e) => setMedia(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
          
          <div className="flex gap-2 sm:gap-3 pt-4">
            <AeButton 
              onClick={onClose}
              variant="secondary"
              className="flex-1 text-sm sm:text-base"
            >
              Cancel
            </AeButton>
            <AeButton
              variant="success"
              disabled={!title || loading}
              loading={loading}
              onClick={handlePost}
              className="flex-1 text-sm sm:text-base"
            >
              {loading ? 'Posting...' : 'Post'}
            </AeButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


