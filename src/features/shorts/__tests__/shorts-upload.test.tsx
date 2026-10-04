import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsUpload } from '../shorts-upload';
import { hostingPrice } from '../shorts-upload-hosting';
import type { Short } from '../types';

type State = Parameters<typeof ShortsUpload>[0]['s'];
const upload = vi.fn();
const signIn = vi.fn();
const pay = vi.fn();
const createQuote = vi.fn();
const state = (overrides: Partial<State> = {}) => ({
  config: { topics: ['All', 'Art', 'Technology'] },
  busy: false,
  authenticated: true,
  actor: 'ak_creator',
  dashboard: { shorts: [], account: { available: '0.08' } },
  upload,
  signIn,
  source: 'wallet',
  setSource: vi.fn(),
  editQuote: vi.fn(),
  createUploadQuote: createQuote,
  confirmUploadFunding: pay,
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
const details = () => {
  selectVideo();
  fireEvent.click(screen.getByRole('button', { name: 'Next: Details' }));
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: '  My first story  ' } });
  fireEvent.change(screen.getByLabelText('Main topic'), { target: { value: 'Technology' } });
  fireEvent.click(screen.getByLabelText(/I have the rights/));
};
const prices = {
  shortId: 'prepared', bytes: 100000000, numerator: '10000000000000000000', denominator: '3000000000', maxDays: 3650,
};
const video = {
  id: 'prepared', title: 'My first story', topic: 'Technology', language: 'und', bytes: 100000000, creator: 'ak_creator', guidelines: { status: 'reviewing' }, hostingStatus: 'unfunded',
} as Short;
const quote = {
  id: '1', shortId: 'prepared', days: 30, charge: '10', unused: '0', source: 'wallet', expiresAt: Date.now() + 1000000, estimatedUntil: Date.now() + 30 * 86400000,
} as State['quote'];
beforeEach(() => {
  vi.clearAllMocks(); upload.mockResolvedValue(true); createQuote.mockResolvedValue(true);
  URL.createObjectURL = vi.fn(() => 'blob:owned'); URL.revokeObjectURL = vi.fn();
});

describe('Four-step Short upload', () => {
  it('validates file format, size and duration before enabling the numbered stepper', () => {
    render(<ShortsUpload s={state()} />);
    expect(screen.getByRole('list', { name: 'Create a Short progress' }).children).toHaveLength(4);
    expect(screen.getByRole('button', { name: '4 Review' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [new File(['image'], 'wrong.png')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('MP4 or MOV');
    const large = new File(['video'], 'large.mp4'); Object.defineProperty(large, 'size', { value: 41 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [large] } });
    expect(screen.getByRole('alert')).toHaveTextContent('under 40 MB');
    selectVideo(61);
    expect(screen.getByRole('alert')).toHaveTextContent('2–60 seconds');
    selectVideo();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeEnabled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('uses the connected wallet and uploads only after the explicit Next action', () => {
    const { rerender } = render(<ShortsUpload s={state({ authenticated: false, actor: '' })} />);
    details();
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet to continue' }));
    expect(signIn).toHaveBeenCalledOnce(); expect(upload).not.toHaveBeenCalled();
    rerender(<ShortsUpload s={state({ authenticated: false })} />);
    expect(screen.getByLabelText(/Title/)).toHaveValue('  My first story  ');
    expect(upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Hosting' }));
    expect(upload).toHaveBeenCalledOnce();
  });

  it('preserves details and coverage when moving back, and pays only from final review', async () => {
    const { rerender } = render(<ShortsUpload s={state()} />);
    details();
    expect(screen.getByLabelText('Timed captions')).not.toBeVisible();
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'A little context.' } });
    const syntheticSwitch = screen.getByRole('switch', { name: /AI-generated/ });
    const sponsoredSwitch = screen.getByRole('switch', { name: /Sponsored/ });
    const rightsCheckbox = screen.getByRole('checkbox', { name: /I have the rights/ });
    fireEvent.click(syntheticSwitch);
    fireEvent.click(sponsoredSwitch);
    expect(screen.getAllByRole('switch').every((control) => (control as HTMLInputElement).checked)).toBe(true);
    fireEvent.click(syntheticSwitch);
    expect(syntheticSwitch).not.toBeChecked();
    expect(sponsoredSwitch).toBeChecked();
    expect(rightsCheckbox).toBeChecked();
    fireEvent.click(syntheticSwitch);
    fireEvent.click(rightsCheckbox);
    expect(screen.getByRole('button', { name: 'Next: Hosting' })).toBeDisabled();
    fireEvent.click(rightsCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Details' }));
    expect(screen.getByLabelText(/Title/)).toHaveValue('  My first story  ');
    fireEvent.click(screen.getByRole('button', { name: 'Next: Hosting' }));
    const [data, key] = upload.mock.calls[0] as [FormData, string];
    expect(data.get('title')).toBe('My first story'); expect(data.get('topic')).toBe('Technology');
    expect(data.get('synthetic')).toBe('true'); expect(data.get('sponsored')).toBe('true'); expect(data.get('rights')).toBe('true');
    const ready = { preparedUpload: { video, key }, uploadPrices: prices };
    rerender(<ShortsUpload s={state(ready)} />);
    expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Hosting' }));
    expect(upload).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
    await waitFor(() => expect(createQuote).toHaveBeenCalledWith({ days: 30 }));
    rerender(<ShortsUpload s={state({ ...ready, quote })} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm hosting · 10 AE' })).toBeVisible());
    expect(pay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm hosting · 10 AE' }));
    expect(pay).toHaveBeenCalledOnce();
  });

  it('keeps the draft after a failed transfer and reports indeterminate processing honestly', () => {
    const { rerender } = render(<ShortsUpload s={state()} />); details();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Hosting' }));
    rerender(<ShortsUpload s={state({ busy: true, walletPending: true })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Confirm ownership in your wallet');
    expect(screen.queryByText('Your upload needs another try')).not.toBeInTheDocument();
    rerender(<ShortsUpload s={state({ busy: true, uploadProgress: 100, uploadStage: 'processing' })} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('value');
    expect(screen.getByRole('button', { name: '2 Details' })).toBeDisabled();
    rerender(<ShortsUpload s={state({ uploadProgress: 100, uploadStage: 'processing' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry upload' }));
    expect(upload).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByLabelText(/Title/)).toHaveValue('  My first story  ');
    expect(screen.getByLabelText(/I have the rights/)).toBeChecked();
  });

  it('requires new preparation after changing an already uploaded title', () => {
    const { rerender } = render(<ShortsUpload s={state()} />); details();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Hosting' }));
    rerender(<ShortsUpload s={state({ preparedUpload: { video, key: upload.mock.calls[0][1] }, uploadPrices: prices })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'A new title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Hosting' }));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[1][0].get('title')).toBe('A new title');
    expect(createQuote).not.toHaveBeenCalled();
  });

  it('refreshes expired review instead of invoking another payment', async () => {
    const { rerender } = render(<ShortsUpload s={state()} />); details();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Hosting' }));
    const ready = { preparedUpload: { video, key: upload.mock.calls[0][1] }, uploadPrices: prices };
    rerender(<ShortsUpload s={state(ready)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));
    rerender(<ShortsUpload s={state({ ...ready, quote: { ...quote!, expiresAt: 1 } })} />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('quote expired'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh hosting quote' }));
    expect(screen.getByRole('button', { name: 'Next: Review' })).toBeVisible();
    expect(pay).not.toHaveBeenCalled();
  });

  it('restores a tab draft and rejects multiple files or unreadable media', () => {
    let draft: State['uploadDraft'];
    const setUploadDraft = vi.fn((next) => { draft = next; });
    const { unmount } = render(<ShortsUpload s={state({ setUploadDraft })} />);
    fireEvent.drop(screen.getByRole('region', { name: 'Video upload' }), { dataTransfer: { files: [new File(['a'], 'a.mp4'), new File(['b'], 'b.mp4')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('one video');
    selectVideo(); fireEvent.error(screen.getByLabelText('Preview your video'));
    expect(screen.getByRole('alert')).toHaveTextContent('H.264');
    details(); unmount();
    render(<ShortsUpload s={state({ uploadDraft: draft, setUploadDraft })} />);
    expect(screen.getByLabelText(/Title/)).toHaveValue('  My first story  ');
    expect(screen.getByLabelText('Preview your video')).toBeInTheDocument();
  });

  it('uses integer pricing and rounds up fractional aettos rather than undercharging', () => {
    expect(hostingPrice(prices, 30)).toBe('10');
    expect(hostingPrice({ ...prices, bytes: 1 }, 1)).toBe('0.000000003333333334');
    expect(hostingPrice(prices, 1.5)).toBeUndefined();
    expect(hostingPrice(prices, 3651)).toBeUndefined();
  });
});
