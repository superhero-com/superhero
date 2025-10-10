import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Legacy page kept for compatibility; immediately redirect to unified PostDetail
export default function TipDetail() {
  const { tipId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tipId) return;
    navigate(`/post/${String(tipId).replace(/_v3$/,'')}`, { replace: true });
  }, [navigate, tipId]);

  return null;
}

 