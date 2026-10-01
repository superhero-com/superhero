import {
  useEffect, useRef, useState, type DragEvent, type FormEvent,
} from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, Check, CheckCircle2, Clapperboard,
  CloudUpload, Film, Heart, LockKeyhole, ScanEye, Share2, Sparkles,
} from 'lucide-react';
import type { useShorts } from './use-shorts';
import './shorts-upload.css';

const languages = [
  ['und', 'No spoken language'], ['en', 'English'], ['ar', 'Arabic'],
  ['fr', 'French'], ['es', 'Spanish'], ['de', 'German'], ['zh', 'Chinese'],
];
const steps = ['Video', 'Details', 'Review'];
type VideoInfo = { duration: number; width: number; height: number };
const durationLabel = (duration: number) => `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;

export const ShortsUpload = ({ s }: { s: ReturnType<typeof useShorts> }) => {
  const [step, setStep] = useState(s.uploadDraft?.step || 0);
  const [file, setFile] = useState<File | undefined>(s.uploadDraft?.file);
  const [preview, setPreview] = useState('');
  const [info, setInfo] = useState<VideoInfo>();
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState(s.uploadDraft?.title ?? '');
  const [description, setDescription] = useState(s.uploadDraft?.description ?? '');
  const [topic, setTopic] = useState(s.uploadDraft?.topic ?? '');
  const [language, setLanguage] = useState(s.uploadDraft?.language ?? 'und');
  const [captions, setCaptions] = useState(s.uploadDraft?.captions ?? '');
  const [synthetic, setSynthetic] = useState(s.uploadDraft?.synthetic ?? false);
  const [sponsored, setSponsored] = useState(s.uploadDraft?.sponsored ?? false);
  const [rights, setRights] = useState(s.uploadDraft?.rights ?? false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const topics = s.config?.topics.filter((value) => value !== 'All') || [];
  const selectedTopic = topic || topics[0] || '';
  const preparing = s.busy && !!s.uploadStage;
  const canContinue = !!file && !!info && !fileError;
  const uploading = s.uploadStage === 'uploading';
  const processing = s.uploadStage === 'processing';
  const phase = processing ? 2 : Number(uploading);
  const phaseTitles = ['Checking your file', 'Sending your video', 'Analyzing your video'];
  const phaseCopy = [
    'Making sure your file is ready for a reliable upload.',
    'Your video is being sent privately. Keep this page open.',
    'Preparing playback and checking your video against our community guidelines for the feed.',
  ];
  const previewTitle = title.trim() || 'Your story, in a Short.';
  const phaseStatus = (index: number) => {
    if (index < phase) return 'Done';
    return index === phase ? 'In progress' : 'Next';
  };
  let nextLabel = ['Continue to details', 'Review your Short'][step];
  if (step === 2) nextLabel = s.uploadProgress === undefined ? 'Upload Short' : 'Try upload again';
  const { setUploadDraft } = s;
  useEffect(() => {
    setUploadDraft({
      step, file, title, description, topic, language, captions, synthetic, sponsored, rights,
    });
  }, [step, file, title, description, topic, language, captions, synthetic, sponsored, rights, setUploadDraft]);
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!file) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault(); const unloadEvent = event; unloadEvent.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [file]);
  const go = (next: number) => {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const choose = (files: File[]) => {
    if (s.busy || !files.length) return;
    s.clearMessage(); setDragging(false); setInfo(undefined); setFileError('');
    setFile(undefined); setRights(false);
    if (files.length !== 1) { setFileError('Choose one video for this Short.'); return; }
    const next = files[0];
    if (!/\.(mp4|mov)$/i.test(next.name)) {
      setFileError('Choose an MP4 or MOV video.'); return;
    }
    if (!next.size || next.size > 40 * 1024 * 1024) {
      setFileError('Choose a video under 40 MB that isn’t empty.'); return;
    }
    setFile(next);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault(); choose(Array.from(event.dataTransfer.files));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (s.busy || !canContinue) return;
    if (step < 2) { if (step === 0 || title.trim()) go(step + 1); return; }
    if (!rights || !title.trim() || !selectedTopic) return;
    const data = new FormData();
    data.set('file', file!); data.set('title', title.trim());
    data.set('description', description.trim()); data.set('topic', selectedTopic);
    data.set('language', language); data.set('captions', captions);
    data.set('synthetic', String(synthetic)); data.set('sponsored', String(sponsored));
    data.set('rights', 'true');
    s.upload(data);
  };
  return (
    <div className="su-composer">
      <ol className="su-steps" aria-label="Create a Short progress">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? 'current' : ''}>
            <button type="button" aria-current={index === step ? 'step' : undefined} disabled={s.busy || index > step} onClick={() => go(index)}>
              <span>{index < step ? <Check size={15} aria-hidden="true" /> : `0${index + 1}`}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      <div className="su-workspace">
        <form className="su-editor" onSubmit={submit} noValidate>
          <div className="su-intro">
            <span className="su-kicker">{preparing ? 'BRINGING YOUR SHORT TO LIFE' : `STEP 0${step + 1} / 03`}</span>
            <h2 ref={heading} tabIndex={-1}>
              {preparing ? phaseTitles[phase] : ['Start with a moment.', 'Give it a little context.', 'One last look.'][step]}
            </h2>
            <p>
              {preparing ? phaseCopy[phase] : [
                'A fresh idea, a tiny tutorial, a moment worth sharing. Make it yours.',
                'Help people discover your Short. Watch the preview come together as you type.',
                'Happy with your Short? Upload it, then choose hosting. Feed eligibility is reviewed separately.',
              ][step]}
            </p>
          </div>
          {preparing ? (
            <section className="su-processing" aria-label="Upload progress">
              <div className="su-process-icon"><ScanEye size={36} aria-hidden="true" /></div>
              <div role="status">
                <strong>{uploading ? `${s.uploadProgress}% uploaded` : phaseTitles[phase]}</strong>
                <progress aria-label={phaseTitles[phase]} max={100} value={uploading ? s.uploadProgress : undefined} />
              </div>
              <ol>
                {['Check file', 'Upload privately', 'Community guidelines'].map((label, index) => (
                  <li key={label} className={index <= phase ? 'reached' : ''} aria-current={index === phase ? 'step' : undefined}>
                    {index < phase ? <CheckCircle2 size={18} aria-hidden="true" /> : <span className="su-process-dot" />}
                    {label}
                    <small>{phaseStatus(index)}</small>
                  </li>
                ))}
              </ol>
              <p>
                <LockKeyhole size={15} aria-hidden="true" />
                {' '}
                Your video will only appear in the feed after review and while hosting is active.
              </p>
            </section>
          ) : (
            <>
              {fileError && (
              <p className="su-error" role="alert">
                {fileError}
                {step > 0 && <button type="button" onClick={() => go(0)}>Change video</button>}
              </p>
              )}
              {step === 0 && (
                <>
                  <div
                    className={`su-dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                    role="region"
                    aria-label="Video upload"
                    onDragOver={(event) => { event.preventDefault(); if (!s.busy) setDragging(true); }}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
                    onDrop={drop}
                  >
                    <input
                      ref={input}
                      id="short-file"
                      className="su-file-input"
                      aria-label="Video file"
                      type="file"
                      accept="video/mp4,video/quicktime,.mp4,.mov"
                      disabled={s.busy}
                      onChange={(event) => { const control = event.currentTarget; choose(Array.from(control.files || [])); control.value = ''; }}
                    />
                    <div className="su-upload-mark"><CloudUpload size={34} aria-hidden="true" /></div>
                    <h3>{file ? 'Your moment is in.' : 'Drop your video here'}</h3>
                    <p>{file ? file.name : 'Or choose a file from your device.'}</p>
                    <button type="button" className={file ? '' : 'primary'} disabled={s.busy} onClick={() => input.current?.click()}>
                      {file ? 'Change video' : 'Choose video'}
                      {' '}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                    {!file && <small>MP4 or MOV · 2–60 seconds · Up to 40 MB</small>}
                    {file && (
                    <div className="su-file-facts">
                      <span>
                        {(file.size / 1024 / 1024).toFixed(1)}
                        {' '}
                        MB
                      </span>
                      <span>{info ? durationLabel(info.duration) : 'Reading video…'}</span>
                      {info && (
                      <span>
                        {info.width}
                        {' '}
                        ×
                        {' '}
                        {info.height}
                      </span>
                      )}
                    </div>
                    )}
                  </div>
                  {canContinue && (
                  <p className="su-file-ready">
                    <CheckCircle2 size={17} aria-hidden="true" />
                    {' '}
                    Video ready.
                    {' '}
                    {info!.width > info!.height ? 'Landscape works too. Your full frame will be kept.' : 'Looking good in the Shorts player.'}
                  </p>
                  )}
                  <div className="su-tips">
                    <Film size={21} aria-hidden="true" />
                    <div>
                      <strong>A great Short starts in the first seconds.</strong>
                      <p>Keep the opening clear. Vertical 9:16 video makes the most of the screen.</p>
                    </div>
                  </div>
                </>
              )}
              {step === 1 && (
                <div className="su-fields">
                  <label htmlFor="short-title">
                    Title
                    <span className="su-count">
                      {title.length}
                      /100
                    </span>
                    <input id="short-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Make them curious" required />
                  </label>
                  <label htmlFor="short-description">
                    Description
                    <span className="su-optional">Optional</span>
                    <textarea id="short-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="The story behind the moment…" />
                  </label>
                  <div className="su-field-pair">
                    <label htmlFor="short-topic">
                      Main topic
                      <select id="short-topic" value={selectedTopic} onChange={(event) => setTopic(event.target.value)}>{topics.map((value) => <option key={value}>{value}</option>)}</select>
                    </label>
                    <label htmlFor="short-language">
                      Spoken language
                      <select id="short-language" value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    </label>
                  </div>
                  <small>Your topic helps discovery. We check the video and its labels during review.</small>
                  <details className="su-captions">
                    <summary>
                      Captions
                      <span>Optional · WebVTT</span>
                    </summary>
                    <label htmlFor="short-captions">
                      Timed captions
                      <textarea id="short-captions" value={captions} onChange={(event) => setCaptions(event.target.value)} maxLength={10000} rows={5} placeholder={'WEBVTT\n\n00:00.000 --> 00:03.000\nYour words here'} />
                    </label>
                    <small>Help people watch without sound. Captions aren’t generated automatically.</small>
                  </details>
                  <fieldset className="su-disclosures">
                    <legend>Keep your audience informed</legend>
                    <label htmlFor="short-synthetic">
                      <input id="short-synthetic" type="checkbox" checked={synthetic} onChange={(event) => setSynthetic(event.target.checked)} />
                      <span>
                        AI-generated or substantially altered
                        <small>Adds an AI-altered label to your Short.</small>
                      </span>
                    </label>
                    <label htmlFor="short-sponsored">
                      <input id="short-sponsored" type="checkbox" checked={sponsored} onChange={(event) => setSponsored(event.target.checked)} />
                      <span>
                        Sponsored or paid promotion
                        <small>Makes your commercial relationship visible.</small>
                      </span>
                    </label>
                  </fieldset>
                </div>
              )}
              {step === 2 && (
                <div className="su-review">
                  <div className="su-review-heading">
                    <span>
                      <CheckCircle2 size={19} aria-hidden="true" />
                      {' '}
                      Ready for review
                    </span>
                    <button type="button" onClick={() => go(1)}>Edit details</button>
                  </div>
                  <h3>{title}</h3>
                  {description && <p className="su-description">{description}</p>}
                  <div className="su-tags">
                    <span>{selectedTopic}</span>
                    <span>{languages.find(([value]) => value === language)?.[1]}</span>
                    <span>{captions.trim() ? 'Captions included' : 'No captions'}</span>
                    {synthetic && <span>AI-altered</span>}
                    {sponsored && <span>Sponsored</span>}
                  </div>
                  <div className="su-next">
                    <h3>What happens next</h3>
                    <ol>
                      <li>
                        <LockKeyhole size={20} aria-hidden="true" />
                        <div>
                          <strong>Upload privately</strong>
                          <p>We prepare your video for playback.</p>
                        </div>
                      </li>
                      <li>
                        <ScanEye size={20} aria-hidden="true" />
                        <div>
                          <strong>Community-guidelines check</strong>
                          <p>We review whether your video can appear in the feed. Follow its status in Studio.</p>
                        </div>
                      </li>
                      <li>
                        <Clapperboard size={20} aria-hidden="true" />
                        <div>
                          <strong>Choose your hosting coverage</strong>
                          <p>See the exact cost before paying. You can host your video even if it isn’t eligible for the feed.</p>
                        </div>
                      </li>
                    </ol>
                  </div>
                  <label className="su-rights" htmlFor="short-rights">
                    <input id="short-rights" type="checkbox" checked={rights} onChange={(event) => setRights(event.target.checked)} />
                    <span>I have the rights to publish this video and its audio.</span>
                  </label>
                </div>
              )}
              <div className="su-actions">
                <div>
                  {step > 0 && (
                  <button type="button" disabled={s.busy} onClick={() => go(step - 1)}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    {' '}
                    Back
                  </button>
                  )}
                </div>
                <button type="submit" className="primary" disabled={s.busy || !canContinue || (step > 0 && !title.trim()) || (step === 2 && !rights)}>
                  {nextLabel}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
              <p className="su-footer-note">{step === 2 ? 'No payment now. Hosting starts only after you approve a quote.' : 'Your video stays on this device until you send it for review.'}</p>
              {s.uploadProgress !== undefined && !s.busy && <p className="su-retry-note">Your upload did not finish. Try again to reuse received parts when the file and details match.</p>}
            </>
          )}
        </form>
        <aside className="su-preview" aria-label="Short preview">
          <div className="su-preview-heading">
            <span>
              <Sparkles size={15} aria-hidden="true" />
              {' '}
              THE VIEWER’S VIEW
            </span>
            <span>Preview</span>
          </div>
          <div className={`su-player ${preview ? 'with-video' : ''}`}>
            {preview ? (
              <video
                key={preview}
                src={preview}
                controls
                playsInline
                preload="metadata"
                aria-label="Preview your video"
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  if (!Number.isFinite(video.duration) || video.duration < 2 || video.duration > 60) {
                    setFileError('Your video must be 2–60 seconds long. Choose another clip.'); setInfo(undefined); return;
                  }
                  setInfo({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
                }}
                onError={() => { setFileError('This video couldn’t be previewed. Try an MP4 with H.264 video.'); setInfo(undefined); }}
              >
                <track kind="captions" />
              </video>
            ) : (
              <div className="su-preview-empty">
                <div className="su-orbit"><Clapperboard size={38} aria-hidden="true" /></div>
                <p>
                  A little moment.
                  <br />
                  <strong>A whole new audience.</strong>
                </p>
              </div>
            )}
            <div className="su-preview-copy">
              <span className="su-preview-author">
                <img src="/logo.png" alt="" />
                {' '}
                Your Short
              </span>
              <strong>{previewTitle}</strong>
              <div>
                {selectedTopic && (
                <span>
                  #
                  {selectedTopic.toLowerCase()}
                </span>
                )}
                {synthetic && <span>AI-altered</span>}
                {sponsored && <span>Sponsored</span>}
              </div>
            </div>
            <div className="su-preview-rail" aria-hidden="true">
              <Heart size={22} />
              <Bookmark size={21} />
              <Share2 size={21} />
            </div>
          </div>
          <p>Public and free to watch once published.</p>
          {file && <small className="su-draft-note">Draft kept while you stay in Shorts. Reloading clears it.</small>}
          {file && <small className="su-preview-filename">{file.name}</small>}
        </aside>
      </div>
    </div>
  );
};
