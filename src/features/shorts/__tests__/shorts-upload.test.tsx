import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsUpload } from '../shorts-upload';

type State = Parameters<typeof ShortsUpload>[0]['s'];
const upload = vi.fn();
const state = (overrides: Partial<State> = {}) => ({
  config: { topics: ['All', 'Art', 'Technology'] },
  busy: false,
  upload,
  setUploadDraft: vi.fn(),
  clearMessage: vi.fn(),
  ...overrides,
} as unknown as State);
const selectVideo = (duration = 8) => {
  fireEvent.change(screen.getByLabelText('Video file'), {
    target: { files: [new File(['owned media'], 'owned.mp4', { type: 'video/mp4' })] },
  });
  const video = screen.getByLabelText('Preview your video');
  Object.defineProperties(video, {
    duration: { configurable: true, value: duration },
    videoWidth: { value: 720 },
    videoHeight: { value: 1280 },
  });
  fireEvent.loadedMetadata(video);
};
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:owned'); URL.revokeObjectURL = vi.fn();
});

describe('Guided Short upload', () => {
  it('requires a supported, readable video within the duration limit before continuing', () => {
    render(<ShortsUpload s={state()} />);
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [new File(['image'], 'wrong.png')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('MP4 or MOV');
    const large = new File(['video'], 'large.mp4'); Object.defineProperty(large, 'size', { value: 41 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [large] } });
    expect(screen.getByRole('alert')).toHaveTextContent('under 40 MB');
    selectVideo(61);
    expect(screen.getByRole('alert')).toHaveTextContent('2–60 seconds');
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeDisabled();
    selectVideo();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeEnabled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('preserves details on back-navigation and submits only the reviewed file and declarations', () => {
    render(<ShortsUpload s={state()} />); selectVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to details' }));
    expect(screen.getByRole('button', { name: 'Review your Short' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: '  My first story  ' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'A little context.' } });
    fireEvent.change(screen.getByLabelText('Main topic'), { target: { value: 'Technology' } });
    fireEvent.click(screen.getByLabelText(/AI-generated/));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to details' }));
    expect(screen.getByLabelText(/Title/)).toHaveValue('  My first story  ');
    fireEvent.click(screen.getByRole('button', { name: 'Review your Short' }));
    expect(screen.getByRole('button', { name: 'Upload Short' })).toBeDisabled();
    expect(upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/I have the rights/));
    fireEvent.click(screen.getByRole('button', { name: 'Upload Short' }));
    expect(upload).toHaveBeenCalledOnce();
    const data = upload.mock.calls[0][0] as FormData;
    expect((data.get('file') as File).name).toBe('owned.mp4');
    expect(data.get('title')).toBe('My first story');
    expect(data.get('topic')).toBe('Technology');
    expect(data.get('synthetic')).toBe('true');
    expect(data.get('sponsored')).toBe('false');
    expect(data.get('rights')).toBe('true');
  });

  it('keeps review available after a failed attempt and shows honest processing progress', () => {
    const { rerender } = render(<ShortsUpload s={state()} />); selectVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to details' }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review your Short' }));
    fireEvent.click(screen.getByLabelText(/I have the rights/));
    rerender(<ShortsUpload s={state({ busy: true, uploadProgress: 100, uploadStage: 'processing' })} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('value');
    expect(screen.queryByRole('button', { name: 'Upload Short' })).not.toBeInTheDocument();
    rerender(<ShortsUpload s={state({ uploadProgress: 100, uploadStage: 'processing' })} />);
    expect(screen.getByRole('button', { name: 'Try upload again' })).toBeEnabled();
    expect(screen.getByLabelText(/I have the rights/)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByLabelText(/Title/)).toHaveValue('Keep this draft');
  });

  it('restores a tab-only draft when returning to the composer', () => {
    let draft: State['uploadDraft'];
    const setUploadDraft = vi.fn((next) => { draft = next; });
    const { unmount } = render(<ShortsUpload s={state({ setUploadDraft })} />);
    selectVideo(); fireEvent.click(screen.getByRole('button', { name: 'Continue to details' }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Return to this idea' } });
    unmount();
    render(<ShortsUpload s={state({ uploadDraft: draft, setUploadDraft })} />);
    expect(screen.getByLabelText(/Title/)).toHaveValue('Return to this idea');
    expect(screen.getByLabelText('Preview your video')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects multiple dropped files and recovers after a decoder error', () => {
    render(<ShortsUpload s={state()} />);
    fireEvent.drop(screen.getByRole('region', { name: 'Video upload' }), {
      dataTransfer: { files: [new File(['a'], 'a.mp4'), new File(['b'], 'b.mp4')] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('one video');
    selectVideo(); fireEvent.error(screen.getByLabelText('Preview your video'));
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('H.264');
    selectVideo();
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeEnabled();
  });
});
