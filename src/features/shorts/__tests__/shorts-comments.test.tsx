import {
  fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsComments } from '../shorts-comments';
import { request, ShortsApiError } from '../api';
import type { ShortsContractPolicy } from '../shorts-contract-policy';

vi.mock('../api', async (original) => ({ ...await original<typeof import('../api')>(), request: vi.fn() }));
vi.mock('../shorts-dialog', () => ({ ShortsDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../shorts-creator', () => ({ ShortsCreator: ({ address }: { address: string }) => <div>{address}</div> }));
const policy = {
  maxCommentChars: 5, maxCommentBytes: 8, commentsEnabled: true,
} as ShortsContractPolicy;
const props = () => ({
  id: 'video', title: 'Test video', actor: 'ak_owner', policy, busy: false, walletPending: false, revision: 0, publishedRevision: 0, message: '', onClose: vi.fn(), onConnect: vi.fn(), onAdd: vi.fn().mockResolvedValue(false),
});
const empty = {
  items: [], next: null, total: '0', version: '0',
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();
  });
  vi.mocked(request).mockResolvedValue(empty);
});
describe('V2 comments', () => {
  it('escapes chain text, shows complete authors and explains that all comments are permanent', async () => {
    vi.mocked(request).mockResolvedValue({
      items: [{
        id: '0', author: 'ak_owner', text: '<img src=x onerror=alert(1)>', height: '1',
      }, {
        id: '1', author: 'ak_other_full_address', text: 'Hello', height: '2',
      }],
      next: null,
      total: '2',
      version: '2',
    });
    const p = props(); const { container } = render(<ShortsComments {...p} />);
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull(); expect(screen.getByText('ak_other_full_address')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    expect(screen.getByText(/Comments are public and permanent/)).toBeInTheDocument();
  });
  it('enforces UTF-8 byte limits and keeps rejected or pending drafts until confirmation', async () => {
    const p = props(); const { rerender } = render(<ShortsComments {...p} />); await screen.findByText('No comments yet.');
    const input = screen.getByLabelText('Add a comment'); fireEvent.focus(input); const submit = screen.getByRole('button', { name: 'Publish with wallet' });
    fireEvent.change(input, { target: { value: '🙂🙂🙂' } }); expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: '🙂🙂' } }); expect(submit).toBeEnabled();
    fireEvent.click(submit); await waitFor(() => expect(p.onAdd).toHaveBeenCalledWith('🙂🙂')); expect(input).toHaveValue('🙂🙂');
    rerender(<ShortsComments {...p} publishedRevision={1} />); expect(input).toHaveValue('');
    rerender(<ShortsComments {...p} policy={{ ...policy, commentsEnabled: false }} />); expect(input).toBeDisabled(); expect(screen.getByText('Comments are currently paused.')).toBeInTheDocument();
  });
  it('restarts pagination after a new comment changes the version', async () => {
    vi.mocked(request).mockResolvedValueOnce({
      ...empty, next: '25', version: '7', total: '26',
    }).mockRejectedValueOnce(new ShortsApiError('Stale comments', 409)).mockResolvedValueOnce({ ...empty, total: '27', version: '8' });
    render(<ShortsComments {...props()} />); fireEvent.click(await screen.findByRole('button', { name: 'More comments' }));
    await screen.findByRole('heading', { name: 'Comments 27' }); expect(vi.mocked(request).mock.calls.map((c) => c[0])).toEqual(['/video/comments', '/video/comments?cursor=25&version=7', '/video/comments']);
  });
  it('offers wallet connection without exposing a form to anonymous visitors', async () => {
    const p = props(); render(<ShortsComments {...p} actor="" />); await screen.findByText('No comments yet.');
    expect(screen.queryByLabelText('Add a comment')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Connect wallet to comment' })); expect(p.onConnect).toHaveBeenCalledOnce();
  });
  it('sorts loaded comments by block height and labels partial results honestly', async () => {
    const items = [
      {
        id: '20', author: 'ak_a', text: 'Earlier', height: '9007199254740992',
      },
      {
        id: '3', author: 'ak_b', text: 'Latest', height: '9007199254740993',
      },
    ];
    vi.mocked(request).mockResolvedValueOnce({
      ...empty, items, next: '2', total: '3',
    })
      .mockResolvedValueOnce({
        ...empty,
        items: [{
          id: '1', author: 'ak_c', text: 'First', height: '1',
        }],
        total: '3',
      });
    render(<ShortsComments {...props()} />);
    await screen.findByText('Latest');
    const content = () => screen.getAllByRole('article').map((item) => within(item).getByText(/Earlier|Latest|First/).textContent);
    expect(content()).toEqual(['Latest', 'Earlier']);
    expect(screen.getByText('2 of 3 loaded')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort loaded comments' }), { target: { value: 'oldest' } });
    expect(content()).toEqual(['Earlier', 'Latest']);
    fireEvent.click(screen.getByRole('button', { name: 'More comments' }));
    await screen.findByText('First');
    expect(content()).toEqual(['First', 'Earlier', 'Latest']);
    expect(screen.getByRole('combobox', { name: 'Sort comments' })).toHaveValue('oldest');
  });
  it('expands on focus, rejects blank drafts, and cancels without submitting', async () => {
    const p = props(); render(<ShortsComments {...p} />);
    await screen.findByText('No comments yet.');
    expect(screen.queryByRole('button', { name: 'Publish with wallet' })).toBeNull();
    const input = screen.getByLabelText('Add a comment'); fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Publish with wallet' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(input).toHaveValue('');
    expect(p.onAdd).not.toHaveBeenCalled();
  });
  it('keeps the draft after an unexpected failure and prevents duplicate submissions', async () => {
    let reject: (reason: Error) => void = () => {};
    const p = props();
    p.onAdd.mockImplementation(() => new Promise((_resolve, failure) => { reject = failure; }));
    render(<ShortsComments {...p} />); await screen.findByText('No comments yet.');
    const input = screen.getByLabelText('Add a comment'); fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish with wallet' }));
    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close comments' })).toBeDisabled();
    fireEvent.submit(input.closest('form')!); expect(p.onAdd).toHaveBeenCalledOnce();
    reject(new Error('offline'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your draft is saved here');
    expect(input).toHaveValue('Hello');
  });
  it('retries the failed next page without dropping loaded comments or the draft', async () => {
    vi.mocked(request).mockResolvedValueOnce({
      ...empty,
      items: [{
        id: '0', author: 'ak_a', text: 'Already loaded', height: '1',
      }],
      next: '1',
      total: '2',
    }).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({
      ...empty,
      items: [{
        id: '1', author: 'ak_b', text: 'Next page', height: '2',
      }],
      total: '2',
    });
    render(<ShortsComments {...props()} />); await screen.findByText('Already loaded');
    fireEvent.change(screen.getByLabelText('Add a comment'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'More comments' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Already loaded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Next page');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByLabelText('Add a comment')).toHaveValue('Hello');
  });
});
