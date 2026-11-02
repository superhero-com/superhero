import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsUpload } from '../shorts-upload';

type State = Parameters<typeof ShortsUpload>[0]['s'];
const publish = vi.fn();
const signIn = vi.fn();
const state = (overrides: Partial<State> = {}) => ({
  config: { topics: ['All', 'Art', 'Technology'] },
  busy: false,
  authenticated: true,
  uploadMaxBytes: 40 * 1048576,
  uploadLimitLabel: '40 MiB',
  actor: 'ak_creator',
  dashboard: { shorts: [], account: { available: '0' } },
  publishUpload: publish,
  signIn,
  setUploadDraft: vi.fn(),
  clearMessage: vi.fn(),
  dismissPublication: vi.fn(),
  resetUpload: vi.fn(),
  ...overrides,
} as unknown as State);
const selectVideo = (duration = 8) => {
  fireEvent.change(screen.getByLabelText('Video file'), {
    target: { files: [new File(['owned media'], 'owned.mp4', { type: 'video/mp4' })] },
  });
  const video = screen.getByLabelText('Preview your video');
  Object.defineProperties(video, {
    duration: { configurable: true, value: duration }, videoWidth: { value: 720 }, videoHeight: { value: 1280 },
  });
  fireEvent.loadedMetadata(video);
};
const details = () => {
  selectVideo();
  fireEvent.click(screen.getByRole('button', { name: 'Next: Details' }));
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: '  My story  ' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Main topic' }), { target: { value: 'Technology' } });
  fireEvent.click(screen.getByLabelText(/I have the rights/));
};
beforeEach(() => {
  vi.clearAllMocks(); publish.mockResolvedValue(true);
  URL.createObjectURL = vi.fn(() => 'blob:owned'); URL.revokeObjectURL = vi.fn();
});

describe('Free three-step upload', () => {
  it('waits for upload limits before accepting a picker or dropped file after reload', () => {
    const view = render(<ShortsUpload s={state({ uploadMaxBytes: 0, uploadLimitLabel: undefined })} />);
    expect(screen.getByLabelText('Video file')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choose video' })).toBeDisabled();
    const files = [new File(['owned media'], 'owned.mp4', { type: 'video/mp4' })];
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files } });
    fireEvent.drop(screen.getByRole('region', { name: 'Video upload' }), { dataTransfer: { files } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Preview your video')).not.toBeInTheDocument();
    view.rerender(<ShortsUpload s={state()} />);
    expect(screen.getByLabelText('Video file')).toBeEnabled();
    selectVideo();
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeEnabled();
  });

  it('validates file type, size and duration with three steps and no hosting controls', () => {
    render(<ShortsUpload s={state()} />);
    expect(screen.getByRole('list', { name: 'Create a Short progress' }).children).toHaveLength(3);
    expect(screen.getByRole('button', { name: '3 Review' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [new File(['x'], 'wrong.png')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('MP4 or MOV');
    const large = new File(['x'], 'large.mp4'); Object.defineProperty(large, 'size', { value: 41 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [large] } });
    expect(screen.getByRole('alert')).toHaveTextContent('up to 40 MiB');
    selectVideo(61); expect(screen.getByRole('alert')).toHaveTextContent('2–60 seconds');
    expect(screen.getByRole('heading', { name: 'Try another moment.' })).toBeVisible();
    selectVideo(); expect(screen.getByRole('button', { name: 'Next: Details' })).toBeEnabled();
    expect(screen.queryByText('Hosting')).not.toBeInTheDocument(); expect(publish).not.toHaveBeenCalled();
  });

  it('allows an original MOV that the browser cannot preview to reach server preparation', () => {
    render(<ShortsUpload s={state()} />);
    const file = new File(['owned HEVC original'], 'camera.mov', { type: 'video/quicktime' });
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [file] } });
    fireEvent.error(screen.getByLabelText('Preview your video'));
    expect(screen.getByRole('status')).toHaveTextContent('You can still upload it');
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Details' }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Camera original' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Main topic' }), { target: { value: 'Art' } });
    fireEvent.click(screen.getByLabelText(/I have the rights/));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(publish).toHaveBeenCalledOnce();
    expect((publish.mock.calls[0][0] as FormData).get('file')).toBe(file);
  });

  it('rechecks a replacement file after an unavailable preview', () => {
    render(<ShortsUpload s={state()} />);
    fireEvent.change(screen.getByLabelText('Video file'), {
      target: { files: [new File(['owned media'], 'camera.mov', { type: 'video/quicktime' })] },
    });
    fireEvent.error(screen.getByLabelText('Preview your video'));
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Video file'), {
      target: { files: [new File(['replacement'], 'next.mp4', { type: 'video/mp4' })] },
    });
    expect(screen.getByRole('heading', { name: 'Reading your video…' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    const video = screen.getByLabelText('Preview your video');
    Object.defineProperties(video, {
      duration: { configurable: true, value: 61 },
      videoWidth: { value: 720 },
      videoHeight: { value: 1280 },
    });
    fireEvent.loadedMetadata(video);
    fireEvent.error(video);
    expect(screen.getByRole('alert')).toHaveTextContent('2–60 seconds');
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeDisabled();
  });

  it('preserves editable details and independent disclosures and publishes only from Review', () => {
    render(<ShortsUpload s={state()} />); details();
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeRequired();
    expect(screen.getByRole('combobox', { name: 'Main topic' })).toBeRequired();
    expect(screen.getByLabelText(/I have the rights/)).toBeRequired();
    expect(screen.getByRole('status')).toHaveTextContent('Required details complete');
    expect(screen.getAllByRole('switch').every((c) => !(c as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByLabelText('Timed captions')).not.toBeVisible();
    fireEvent.click(screen.getByRole('switch', { name: /AI-generated/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Sponsored/ }));
    expect(screen.getAllByRole('switch').every((c) => (c as HTMLInputElement).checked)).toBe(true);
    fireEvent.click(screen.getByLabelText(/I have the rights/));
    expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Still needed: publishing rights.');
    fireEvent.click(screen.getByLabelText(/I have the rights/));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
    expect(publish).not.toHaveBeenCalled();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('About publishing'));
    expect(screen.getByText(/Superhero covers storage/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByLabelText(/Title/)).toHaveValue('  My story  ');
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(publish).toHaveBeenCalledOnce();
    const data = publish.mock.calls[0][0] as FormData;
    expect(data.get('title')).toBe('My story'); expect(data.get('rights')).toBe('true');
    expect(data.get('synthetic')).toBe('true'); expect(data.get('sponsored')).toBe('true');
    expect(data.has('budget')).toBe(false); expect(data.has('days')).toBe(false);
  });

  it('connecting a guest never publishes automatically', () => {
    const { rerender } = render(<ShortsUpload s={state({ actor: '', authenticated: false })} />); details();
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet to continue' }));
    expect(signIn).toHaveBeenCalledOnce(); expect(publish).not.toHaveBeenCalled();
    rerender(<ShortsUpload s={state()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
    expect(publish).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it.each([[false, false], [true, false], [false, true]])(
    'allows independent labels through Review (AI: %s, sponsored: %s)',
    (synthetic, sponsored) => {
      render(<ShortsUpload s={state()} />); details();
      if (synthetic) fireEvent.click(screen.getByRole('switch', { name: /AI-generated/ }));
      if (sponsored) fireEvent.click(screen.getByRole('switch', { name: /Sponsored/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
      const review = within(screen.getByRole('region', { name: 'Your Short' }));
      expect(!!review.queryByText('AI-altered')).toBe(synthetic);
      expect(!!review.queryByText('Sponsored')).toBe(sponsored);
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
      const data = publish.mock.calls[0][0] as FormData;
      expect(data.get('synthetic')).toBe(String(synthetic));
      expect(data.get('sponsored')).toBe(String(sponsored));
    },
  );

  it('keeps Review, preview and footer mounted during upload, publication, failure and completion', () => {
    const view = (overrides: Partial<State> = {}) => <MemoryRouter><ShortsUpload s={state(overrides)} /></MemoryRouter>;
    const { rerender } = render(view()); details();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
    const preview = screen.getByLabelText('Preview your video');
    (['uploading', 'publishing', 'error', 'published'] as const).forEach((phase) => {
      rerender(view({ busy: ['uploading', 'publishing'].includes(phase), uploadPublication: { shortId: 'video', status: phase } }));
      expect(screen.getByRole('button', { name: '3 Review' })).toHaveAttribute('aria-current', 'step');
      expect(screen.getByLabelText('Preview your video')).toBe(preview);
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
      const overlay = screen.getByRole('region', { name: 'Publishing your Short' });
      expect(within(overlay).queryByText(/payment|wallet|hosting/i)).not.toBeInTheDocument();
      if (phase === 'error') expect(within(overlay).getByRole('button', { name: 'Back to review' })).toBeEnabled();
      if (phase === 'published') expect(within(overlay).getByRole('link', { name: 'Watch & share' })).toHaveAttribute('href', '/shorts?short=video');
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it('presents saved uploads awaiting review without failure or public playback actions', () => {
    render(<MemoryRouter><ShortsUpload s={state({ uploadPublication: { shortId: 'video', status: 'reviewing' } })} /></MemoryRouter>);
    const overlay = screen.getByRole('region', { name: 'Publishing your Short' });
    expect(within(overlay).getByRole('heading', { name: 'Your Short is awaiting review' })).toBeVisible();
    expect(within(overlay).getByRole('link', { name: 'View in Studio' })).toHaveAttribute('href', '/shorts/studio/video/video');
    expect(within(overlay).queryByText('Let’s try that again')).not.toBeInTheDocument();
    expect(within(overlay).queryByRole('link', { name: 'Watch & share' })).not.toBeInTheDocument();
    expect(within(overlay).getByText('Awaiting review')).toBeVisible();
  });

  it('lets creators leave a saved publication to check its progress in Studio', () => {
    render(<MemoryRouter><ShortsUpload s={state({ busy: true, uploadPublication: { shortId: 'video', status: 'publishing' } })} /></MemoryRouter>);
    const overlay = screen.getByRole('region', { name: 'Publishing your Short' });
    expect(within(overlay).getByRole('link', { name: 'View in Studio' })).toHaveAttribute('href', '/shorts/studio/video/video');
    expect(within(overlay).getByText(
      /Your upload is saved. We’re confirming publication/,
    )).toBeVisible();
    expect(within(overlay).queryByText(/Keep this page open/)).not.toBeInTheDocument();
    expect(within(overlay).queryByRole('link', { name: 'Watch & share' })).not.toBeInTheDocument();
  });
});
