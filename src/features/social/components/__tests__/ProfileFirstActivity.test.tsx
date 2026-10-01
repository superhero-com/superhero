import { render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import useFirstAccountActivity from '@/hooks/useFirstAccountActivity';
import ProfileFirstActivity from '../ProfileFirstActivity';

vi.mock('@/hooks/useFirstAccountActivity');

function setTimestamp(data: number | null | undefined) {
  vi.mocked(useFirstAccountActivity).mockReturnValue(
    { data } as ReturnType<typeof useFirstAccountActivity>,
  );
}

describe('ProfileFirstActivity', () => {
  it('labels chain activity honestly and renders a UTC date with a machine-readable timestamp', () => {
    setTimestamp(Date.UTC(2020, 0, 2, 0, 10));
    render(<ProfileFirstActivity address="ak_test" />);
    expect(screen.getByTestId('profile-first-activity')).toHaveTextContent('Joined at: January 2, 2020');
    expect(screen.getByText('January 2, 2020')).toHaveAttribute('datetime', '2020-01-02T00:10:00.000Z');
  });

  it.each([null, undefined])('omits the row when history is unavailable (%s)', (timestamp) => {
    setTimestamp(timestamp);
    render(<ProfileFirstActivity address="ak_test" />);
    expect(screen.queryByTestId('profile-first-activity')).not.toBeInTheDocument();
  });
});
