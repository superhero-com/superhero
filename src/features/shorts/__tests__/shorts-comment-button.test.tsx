import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import {
  beforeEach, expect, it, vi,
} from 'vitest';
import { ShortsCommentButton } from '../shorts-comment-button';
import { request } from '../api';

vi.mock('../api', () => ({ request: vi.fn() }));
beforeEach(() => { vi.mocked(request).mockReset(); });

it('loads only the active video and refreshes the count when returning from comments', async () => {
  vi.mocked(request).mockResolvedValueOnce({ comments: '4' }).mockResolvedValueOnce({ comments: '5' });
  const onClick = vi.fn();
  const view = render(<ShortsCommentButton id="one" active={false} onClick={onClick} />);
  expect(request).not.toHaveBeenCalled();
  view.rerender(<ShortsCommentButton id="one" active onClick={onClick} />);
  expect(await screen.findByLabelText('4 comments')).toHaveTextContent('4');
  expect(request).toHaveBeenCalledWith('/one/stats', undefined, undefined, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  fireEvent.click(screen.getByRole('button', { name: 'Video comments' }));
  expect(onClick).toHaveBeenCalledOnce();
  view.rerender(<ShortsCommentButton id="one" active={false} onClick={onClick} />);
  view.rerender(<ShortsCommentButton id="one" active onClick={onClick} />);
  expect(await screen.findByLabelText('5 comments')).toHaveTextContent('5');
});

it.each([['0', '0'], ['1250', '1.3K']])('shows the real count %s with a compact visible label', async (count, label) => {
  vi.mocked(request).mockResolvedValue({ comments: count });
  render(<ShortsCommentButton id="one" active onClick={vi.fn()} />);
  expect(await screen.findByLabelText(`${BigInt(count).toLocaleString()} comments`)).toHaveTextContent(label);
});

it('does not show a false zero or a previous video’s count when a request fails', async () => {
  let resolve: (value: { comments: string }) => void = () => {};
  vi.mocked(request).mockReturnValueOnce(new Promise((done) => { resolve = done; }))
    .mockRejectedValueOnce(new Error('Offline'));
  const onClick = vi.fn();
  const view = render(<ShortsCommentButton id="one" active onClick={onClick} />);
  const signal = vi.mocked(request).mock.calls[0][3]!.signal!;
  view.rerender(<ShortsCommentButton id="two" active onClick={onClick} />);
  await act(async () => { resolve({ comments: '9' }); });
  expect(signal.aborted).toBe(true);
  expect(screen.getByLabelText('Comment count unavailable')).toHaveTextContent('—');
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  expect(screen.queryByText('9')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Video comments' })).toBeEnabled();
});
