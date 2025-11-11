import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PostsService } from '@/api/generated';

// Legacy page kept for compatibility; immediately redirect to unified PostDetail
export default function TipDetail() {
  const { tipId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function go() {
      if (!tipId) return;
      const base = String(tipId).replace(/_v3$/,'');
      // Try resolve slug by fetching post details
      try {
        const data: any = await PostsService.getById({ id: `${base}_v3` });
        const target = (data?.slug as string) || base;
        if (!cancelled) navigate(`/post/${target}`, { replace: true });
        return;
      } catch {}
      if (!cancelled) navigate(`/post/${base}`, { replace: true });
    }
    go();
    return () => { cancelled = true; };
  }, [navigate, tipId]);

  return null;
}

 