import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AddressAvatar from '@/components/AddressAvatar';
import ProfileIdentity from '@/features/social/components/ProfileIdentity';
import { useChainName } from '@/hooks/useChainName';
import { AccountsService } from '@/api/generated';
import {
  getLinkedPreferredAensName, getLinkedXUsername, isXLinked, type AccountAggregate,
} from '@/api/backend';

export const ShortsCreatorAvatar = ({ address, size = 44 }: { address: string; size?: number }) => (
  <Link className="sv-creator-avatar" to={`/users/${address}`} aria-label={`View creator ${address}`}>
    <AddressAvatar address={address} size={size} borderRadius="14px" />
  </Link>
);

/** The same identity hierarchy and address chip as the main profile. */
export const ShortsCreator = ({ address, enabled = true }: { address: string; enabled?: boolean }) => {
  const { chainName } = useChainName(address, { lookup: enabled });
  const { data } = useQuery<AccountAggregate>({
    queryKey: ['AccountsService.getAccount', address],
    // The generated DTO predates the account links/profile aggregate used by profiles.
    queryFn: async () => await AccountsService.getAccount({ address }) as unknown as AccountAggregate,
    enabled,
    staleTime: 10_000,
    retry: 1,
  });
  const displayName = (getLinkedPreferredAensName(data) || data?.public_name || chainName || '').trim() || address;
  return (
    <div className="sv-creator">
      <ShortsCreatorAvatar address={address} />
      <div className="sv-creator-identity">
        <ProfileIdentity
          headingAs="h3"
          address={address}
          displayName={displayName}
          handle={chainName}
          isVerified={isXLinked(data)}
          verifiedUsername={getLinkedXUsername(data)}
          ownProfile={false}
        />
      </div>
    </div>
  );
};
