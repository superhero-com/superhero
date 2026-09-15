import type { CancelablePromise } from './generated/core/CancelablePromise';
import { OpenAPI } from './generated/core/OpenAPI';
import { request as __request } from './generated/core/request';

// Followers/following list contract from `GET /social-graph/{followers,following}`
// (superhero-api social-graph plugin). The generated client only carries the
// config/relationship/precheck routes today, so these two are called through the
// same request core by hand until `npm run generate:api` picks them up — the
// method and type names mirror the API operationIds so that regeneration is a
// straight import swap, not a rewrite.

export type SocialGraphAccountProfile = {
  fullname: string | null;
  bio: string | null;
  site: string | null;
  avatarurl: string | null;
  username: string | null;
  prefered_aens_name: string | null;
  x_username: string | null;
  chain_name: string | null;
  chain_expires_at: string | null;
};

export type SocialGraphAccount = {
  address: string;
  profile: SocialGraphAccountProfile;
  /** Best display name: preferred AENS -> chain name -> address. */
  public_name: string;
};

export type SocialGraphConnectionsPage = {
  items: SocialGraphAccount[];
  /** Opaque cursor for the next page; pass back as `cursor`. `null` on the last page. */
  next_cursor: string | null;
};

type ListParams = {
  address: string;
  search?: string;
  cursor?: string;
  limit?: number;
};

export class SocialGraphConnectionsService {
  /**
   * An account's followers, newest first, searchable and keyset-paged.
   */
  public static listSocialGraphFollowers(
    {
      address, search, cursor, limit,
    }: ListParams,
  ): CancelablePromise<SocialGraphConnectionsPage> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/social-graph/followers',
      query: {
        address, search, cursor, limit,
      },
      errors: {
        400: 'Invalid address or query.',
        503: 'Contract not configured.',
      },
    });
  }

  /**
   * Accounts an account follows, newest first, searchable and keyset-paged.
   */
  public static listSocialGraphFollowing(
    {
      address, search, cursor, limit,
    }: ListParams,
  ): CancelablePromise<SocialGraphConnectionsPage> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/social-graph/following',
      query: {
        address, search, cursor, limit,
      },
      errors: {
        400: 'Invalid address or query.',
        503: 'Contract not configured.',
      },
    });
  }
}
