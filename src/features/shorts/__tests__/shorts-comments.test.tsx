import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsComments } from '../shorts-comments';
import { request, ShortsApiError } from '../api';
import type { ShortsContractPolicy } from '../shorts-contract-policy';

vi.mock('../api', async (original) => ({ ...await original<typeof import('../api')>(), request: vi.fn() }));
vi.mock('../shorts-dialog', () => ({ ShortsDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const policy = { maxCommentChars: 5, maxCommentBytes: 8, commentsEnabled: true } as ShortsContractPolicy;
const props = () => ({
  id: 'video', title: 'Test video', actor: 'ak_owner', policy, busy: false, walletPending: false, revision: 0, publishedRevision: 0, message: '', onClose: vi.fn(), onConnect: vi.fn(), onAdd: vi.fn().mockResolvedValue(false),
});
const empty = {
  items: [], next: null, total: '0', version: '0',
};
beforeEach(() => { vi.clearAllMocks(); vi.mocked(request).mockResolvedValue(empty); });
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
    expect(screen.getByText(/Comments are permanent public blockchain records and cannot be edited or deleted/)).toBeInTheDocument();
  });
  it('enforces UTF-8 byte limits and keeps rejected or pending drafts until confirmation', async () => {
    const p = props(); const { rerender } = render(<ShortsComments {...p} />); await screen.findByText('No comments yet.');
    const input = screen.getByLabelText('Add a comment'); const submit = screen.getByRole('button', { name: 'Publish with wallet' });
    fireEvent.change(input, { target: { value: '🙂🙂🙂' } }); expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: '🙂🙂' } }); expect(submit).toBeEnabled();
    fireEvent.click(submit); await waitFor(() => expect(p.onAdd).toHaveBeenCalledWith('🙂🙂')); expect(input).toHaveValue('🙂🙂');
    rerender(<ShortsComments {...p} publishedRevision={1} />); expect(input).toHaveValue('');
    rerender(<ShortsComments {...p} policy={{ ...policy, commentsEnabled: false }} />); expect(input).toBeDisabled(); expect(submit).toBeDisabled();
  });
  it('restarts pagination after a new comment changes the version', async () => {
    vi.mocked(request).mockResolvedValueOnce({
      ...empty, next: '25', version: '7', total: '26',
    }).mockRejectedValueOnce(new ShortsApiError('Stale comments', 409)).mockResolvedValueOnce({ ...empty, total: '27', version: '8' });
    render(<ShortsComments {...props()} />); fireEvent.click(await screen.findByRole('button', { name: 'More comments' }));
    await screen.findByText('Comments (27)'); expect(vi.mocked(request).mock.calls.map((c) => c[0])).toEqual(['/video/comments', '/video/comments?cursor=25&version=7', '/video/comments']);
  });
  it('offers wallet connection without exposing a form to anonymous visitors', async () => {
    const p = props(); render(<ShortsComments {...p} actor="" />); await screen.findByText('No comments yet.');
    expect(screen.queryByLabelText('Add a comment')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Connect wallet to comment' })); expect(p.onConnect).toHaveBeenCalledOnce();
  });
});
