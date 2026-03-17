import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '../backend';

const mockFetch = vi.fn();

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
