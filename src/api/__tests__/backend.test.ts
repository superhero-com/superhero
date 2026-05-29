import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  getLinkedBio,
  getLinkedPreferredAensName,
  getLinkedSite,
  getLinkedXUsername,
  isXLinked,
  patchAccountCacheEntry,
  profileAggregateFromSources,
  resolveLinkedBioForCache,
  resolveLinkedPreferredAensNameForCache,
  SuperheroApi,
} from '../backend';

const mockFetch = vi.fn();

describe('getLinkedBio', () => {
  it('prefers links.bio over profile and legacy fields', () => {
    expect(getLinkedBio({
      links: { bio: 'from links' },
      profile: { bio: 'from profile' } as any,
      bio: 'legacy',
    })).toBe('from links');
  });

  it('returns null for empty values', () => {
    expect(getLinkedBio({ links: { bio: '   ' }, profile: { bio: '' } as any })).toBeNull();
  });
});

describe('profileAggregateFromSources', () => {
  it('merges account links.bio into profile aggregate', () => {
    const aggregate = profileAggregateFromSources(
      {
        address: 'ak_test',
        links: { bio: 'linked bio' },
        profile: { fullname: 'Name', bio: '', avatarurl: 'https://x.test/a.png' } as any,
      },
      null,
    );
    expect(aggregate.profile.bio).toBe('linked bio');
    expect(aggregate.profile.fullname).toBe('Name');
  });
});

describe('resolveLinkedBioForCache', () => {
  it('uses form bio when bio changed', () => {
    expect(resolveLinkedBioForCache({
      bioChanged: true,
      formBio: 'new',
      updated: { links: { bio: 'stale' } },
      previous: { links: { bio: 'old' } },
    })).toBe('new');
  });

  it('clears bio when bio changed to empty', () => {
    expect(resolveLinkedBioForCache({
      bioChanged: true,
      formBio: '',
      previous: { links: { bio: 'old' } },
    })).toBeNull();
  });

  it('falls back to previous only when bio did not change', () => {
    expect(resolveLinkedBioForCache({
      bioChanged: false,
      formBio: '',
      updated: null,
      previous: { links: { bio: 'kept' } },
    })).toBe('kept');
  });
});

describe('getLinkedPreferredAensName', () => {
  it('prefers links.prefaens over profile chain_name', () => {
    expect(getLinkedPreferredAensName({
      links: { prefaens: 'hero.chain' },
      profile: { chain_name: 'other.chain' } as any,
    })).toBe('hero.chain');
  });

  it('reads the prefered_aens_name link variant', () => {
    expect(getLinkedPreferredAensName({
      links: { prefered_aens_name: 'underscore.chain' },
    })).toBe('underscore.chain');
  });

  it('reads the hyphenated prefered-aens-name link variant', () => {
    expect(getLinkedPreferredAensName({
      links: { 'prefered-aens-name': 'hyphen.chain' } as any,
    })).toBe('hyphen.chain');
  });

  it('normalizes the resolved name (trim + lowercase)', () => {
    expect(getLinkedPreferredAensName({
      links: { prefaens: '  HeRo.Chain  ' },
    })).toBe('hero.chain');
  });

  it('falls through empty/whitespace links to public_name when it looks like a name', () => {
    expect(getLinkedPreferredAensName({
      links: { prefaens: '   ' },
      public_name: 'Public.chain',
    })).toBe('public.chain');
  });

  it('ignores public_name without a dot and falls back to profile chain_name', () => {
    expect(getLinkedPreferredAensName({
      public_name: 'justaname',
      profile: { chain_name: 'fromprofile.chain' } as any,
    })).toBe('fromprofile.chain');
  });

  it('falls back to the legacy chain_name field last', () => {
    expect(getLinkedPreferredAensName({
      chain_name: 'Legacy.chain',
    })).toBe('legacy.chain');
  });

  it('returns null when nothing resolves', () => {
    expect(getLinkedPreferredAensName({
      links: { prefaens: '' },
      public_name: '   ',
      profile: { chain_name: null } as any,
      chain_name: null,
    })).toBeNull();
  });

  it('handles null/undefined account', () => {
    expect(getLinkedPreferredAensName(null)).toBeNull();
    expect(getLinkedPreferredAensName(undefined)).toBeNull();
  });
});

describe('getLinkedXUsername', () => {
  it('prefers links.x and strips a leading @', () => {
    expect(getLinkedXUsername({
      links: { x: '@hero' },
      profile: { x_username: 'profilehero' } as any,
      x_username: 'legacyhero',
    })).toBe('hero');
  });

  it('falls back to the profile x_username', () => {
    expect(getLinkedXUsername({
      links: { x: '   ' },
      profile: { x_username: '@profilehero' } as any,
    })).toBe('profilehero');
  });

  it('falls back to the legacy x_username', () => {
    expect(getLinkedXUsername({ x_username: '@legacyhero' })).toBe('legacyhero');
  });

  it('returns null when no username is present', () => {
    expect(getLinkedXUsername({ links: { x: '' }, x_username: '   ' })).toBeNull();
    expect(getLinkedXUsername(null)).toBeNull();
  });
});

describe('isXLinked', () => {
  it('reflects whether an X username resolves', () => {
    expect(isXLinked({ links: { x: '@hero' } })).toBe(true);
    expect(isXLinked({ links: { x: '' } })).toBe(false);
    expect(isXLinked(null)).toBe(false);
  });
});

describe('getLinkedSite', () => {
  it('returns the trimmed links.site value', () => {
    expect(getLinkedSite({ links: { site: '  https://hero.test  ' } })).toBe('https://hero.test');
  });

  it('returns null when no site is linked', () => {
    expect(getLinkedSite({ links: { site: '   ' } })).toBeNull();
    expect(getLinkedSite({ links: {} })).toBeNull();
    expect(getLinkedSite(null)).toBeNull();
  });
});

describe('resolveLinkedPreferredAensNameForCache', () => {
  it('uses form value when chain name changed', () => {
    expect(resolveLinkedPreferredAensNameForCache({
      chainNameChanged: true,
      formChainName: 'new.chain',
      previous: { links: { prefaens: 'old.chain' } },
    })).toBe('new.chain');
  });
});

describe('patchAccountCacheEntry', () => {
  it('clears links.bio on unlink', () => {
    const next = patchAccountCacheEntry(
      { links: { bio: 'old' }, bio: 'old', profile: { bio: 'old' } },
      { updatedProfile: { address: 'ak_test', profile: { bio: '' } as any, public_name: null }, bioChanged: true, formBio: '' },
    );
    expect(next.links).toEqual({ bio: null });
    expect(next.bio).toBeNull();
  });

  it('clears preferred name links on unlink', () => {
    const next = patchAccountCacheEntry(
      { links: { prefaens: 'hero.chain' }, chain_name: 'hero.chain' },
      {
        updatedProfile: { address: 'ak_test', profile: { chain_name: '' } as any, public_name: null },
        chainNameChanged: true,
        formChainName: '',
      },
    );
    expect((next.links as { prefaens: null }).prefaens).toBeNull();
    expect(next.chain_name).toBeNull();
  });
});

describe('SuperheroApi.fetchJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('maps aborted requests to a timeout error', async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementationOnce((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
      });
    }));

    const request = SuperheroApi.fetchJson('/slow');
    const assertion = expect(request).rejects.toThrow(
      'Request timeout: The API request took too long. Please try again.',
    );
    await vi.advanceTimersByTimeAsync(90_000);

    await assertion;
  });

  it('maps fetch transport failures to a network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('failed to fetch'));

    await expect(SuperheroApi.fetchJson('/offline')).rejects.toThrow(
      'Network error: Unable to connect to API. Please check your internet connection.',
    );
  });

  it('returns null for empty successful responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-length': '0' }),
    });

    await expect(SuperheroApi.fetchJson('/empty')).resolves.toBeNull();
  });

  it('prefers backend JSON error messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => JSON.stringify({ message: 'backend exploded' }),
    });

    await expect(SuperheroApi.fetchJson('/boom')).rejects.toThrow(
      'Superhero API error (500): backend exploded',
    );
  });

  it('truncates large non-json error payloads', async () => {
    const errorBody = 'x'.repeat(250);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: async () => errorBody,
    });

    await expect(SuperheroApi.fetchJson('/gateway')).rejects.toThrow(
      `Superhero API error (502): ${errorBody.slice(0, 200)}...`,
    );
  });
});
