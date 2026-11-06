import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import ProfileImageCropDialog from './ProfileImageCropDialog';

const mocks = vi.hoisted(() => ({ change: vi.fn(), exportCrop: vi.fn() }));
vi.mock('./ProfileImageProvider', () => ({
  useImageActions: () => ({ change: mocks.change, busy: false, pending: undefined }),
}));
vi.mock('./crop', () => ({ exportProfileCrop: mocks.exportCrop }));
vi.mock('react-easy-crop', async () => {
  const { useEffect, useRef } = await import('react');
  const Cropper = ({ onCropAreaChange }: {
    onCropAreaChange: (percent: unknown, pixels: unknown) => void;
  }) => {
    const measured = useRef(false);
    useEffect(() => {
      if (measured.current) return;
      measured.current = true;
      onCropAreaChange({}, {
        x: 50, y: 20, width: 300, height: 300,
      });
    }, [onCropAreaChange]);
    return <div data-testid="cropper" />;
  };
  return { default: Cropper };
});
const bitmap = { width: 800, height: 600 } as ImageBitmap;
function mount() {
  const onClose = vi.fn();
  render(<ProfileImageCropDialog imageRole="avatar" image={{ url: 'blob:local-image', bitmap }} selectionError="" onClose={onClose} onChoose={vi.fn()} onRestoreFocus={vi.fn()} />);
  return { onClose };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.change.mockResolvedValue(undefined);
  mocks.exportCrop.mockResolvedValue(new Blob(['compressed-image'], { type: 'image/webp' }));
});

describe('profile crop approval', () => {
  it('cancels without exporting, uploading, or requesting a signature', () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.exportCrop).not.toHaveBeenCalled();
    expect(mocks.change).not.toHaveBeenCalled();
  });

  it('keeps the crop open after a wallet refusal and allows retry', async () => {
    mocks.change.mockRejectedValueOnce(new Error('Wallet declined'));
    const { onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText('Wallet declined');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('cropper')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(mocks.exportCrop).toHaveBeenLastCalledWith(bitmap, {
      x: 50, y: 20, width: 300, height: 300,
    }, 'avatar');
    expect(mocks.change).toHaveBeenLastCalledWith('avatar', expect.any(Blob));
  });

  it('prevents a second submission while the image is being prepared', async () => {
    let finish!: (value: Blob) => void;
    mocks.exportCrop.mockImplementation(() => new Promise<Blob>((resolve) => { finish = resolve; }));
    const { onClose } = mount();
    const apply = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(apply); fireEvent.click(apply);
    expect(apply).toBeDisabled();
    expect(mocks.exportCrop).toHaveBeenCalledOnce();
    finish(new Blob(['image'], { type: 'image/webp' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(mocks.change).toHaveBeenCalledOnce();
  });
});
