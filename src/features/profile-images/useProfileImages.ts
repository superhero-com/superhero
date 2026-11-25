import { useQuery } from '@tanstack/react-query';
import { ImageConfig, imageRequest, readProfileImages } from './api';

export function useImageConfig() {
  return useQuery({
    queryKey: ['profile-images-config'], queryFn: ({ signal }) => imageRequest<ImageConfig>('/config', undefined, undefined, signal), staleTime: 60000, retry: false, retryOnMount: false,
  });
}
export function useProfileImages(address?: string) {
  const config = useImageConfig();
  return useQuery({
    queryKey: ['profile-images', address],
    queryFn: () => readProfileImages(address!),
    enabled: !!config.data?.enabled && !!address?.startsWith('ak_'),
    staleTime: 15000,
    refetchInterval: 60000,
    retry: false,
  });
}
