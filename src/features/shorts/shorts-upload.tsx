import {
  useEffect, useRef, useState, type DragEvent, type FormEvent,
} from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, CheckCircle2, Clapperboard,
  CloudUpload, Heart, LockKeyhole, ScanEye, Share2, Sparkles, ChevronDown,
} from 'lucide-react';
import type { useShorts } from './use-shorts';
import './shorts-upload.css';
import {
  UploadReview, UploadPublishOverlay,
} from './shorts-upload-publish';

const languages = [
  ['und', 'No spoken language'], ['en', 'English'], ['ar', 'Arabic'],
  ['fr', 'French'], ['es', 'Spanish'], ['de', 'German'], ['zh', 'Chinese'],
];
const steps = ['Video', 'Details', 'Review'];
type VideoInfo = { duration: number; width: number; height: number };
const durationLabel = (duration: number) => `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;

export const ShortsUpload = ({ s }: { s: ReturnType<typeof useShorts> }) => {
  const [step, setStep] = useState(Math.min(s.uploadDraft?.step || 0, 2));
  const [revision, setRevision] = useState(s.uploadDraft?.revision || 0);
  const [previewOpen, setPreviewOpen] = useState(false);
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
  const selectedTopic = topic;
  const inputKey = JSON.stringify([revision, file?.name, file?.size, file?.lastModified, title.trim(), description.trim(), selectedTopic, language, captions, synthetic, sponsored, rights]);
  const publishing = !!s.uploadPublication;
  const verifying = !publishing && s.busy && s.walletPending && !s.uploadStage;
  const preparing = !publishing && s.busy && !!s.uploadStage;
  const canContinue = !!file && !!info && !fileError;
  const uploading = s.uploadStage === 'uploading';
  const processing = s.uploadStage === 'processing';
  const phase = processing ? 2 : Number(uploading);
  const phaseTitles = [verifying ? 'Getting your upload ready' : 'Checking your file', 'Sending your video', 'Preparing your video'];
  const phaseCopy = [
    'Making sure your file is ready for a reliable upload.',
    'Your video is being sent privately. Keep this page open.',
    'Getting your Short ready to play.',
  ];
  const previewTitle = title.trim() || 'Your story, in a Short.';
  const phaseStatus = (index: number) => {
    if (index < phase) return 'Done';
    return index === phase ? 'In progress' : 'Next';
  };
  let nextLabel = ['Next: Details', 'Next: Review', 'Publish'][step];
  if (step === 1 && !s.actor) nextLabel = 'Connect wallet to continue';
  if (publishing) nextLabel = 'Publish';
  else if (s.busy) nextLabel = 'Please wait…';
  const disabled = s.busy || publishing || (step > 0 && s.restoringCreatorSession) || !canContinue || (step > 0 && (!title.trim() || !selectedTopic || !rights));
  const { setUploadDraft } = s;
  useEffect(() => {
    setUploadDraft({
      step, revision, file, title, description, topic, language, captions, synthetic, sponsored, rights,
    });
  }, [step, revision, file, title, description, topic, language, captions, synthetic, sponsored, rights, setUploadDraft]);
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!file || s.uploadPublication?.status === 'published') return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault(); const unloadEvent = event; unloadEvent.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [file, s.uploadPublication]);
  const go = (next: number) => {
    if (s.busy || publishing) return;
    s.clearMessage();
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
    setRevision((value) => value + 1); setFile(next);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault(); choose(Array.from(event.dataTransfer.files));
  };
  const sendVideo = async () => {
    const data = new FormData();
    data.set('file', file!); data.set('title', title.trim());
    data.set('description', description.trim()); data.set('topic', selectedTopic);
    data.set('language', language); data.set('captions', captions);
    data.set('synthetic', String(synthetic)); data.set('sponsored', String(sponsored));
    data.set('rights', 'true');
    await s.publishUpload(data, inputKey);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    if (step === 0) { go(1); return; }
    if (!s.actor) { await s.signIn(); return; }
    if (step === 1) { go(2); return; }
    await sendVideo();
  };
  return (
    <div className="su-composer">
      <header className="su-header">
        <div className="su-title">
          <span className="sh-eyebrow">YOUR CREATOR SPACE</span>
          <h1>Create a Short</h1>
        </div>
      </header>
      <div className={`su-workspace ${previewOpen ? 'su-preview-open' : ''}`}>
        <button type="button" className="su-mobile-preview-toggle" disabled={publishing} aria-expanded={previewOpen} aria-controls="su-preview" onClick={() => setPreviewOpen(!previewOpen)}>
          {previewOpen ? 'Hide preview' : 'Show video preview'}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <form className="su-editor" onSubmit={submit} noValidate inert={publishing}>
          <div className="su-intro">
            <span className="su-kicker">{preparing ? 'BRINGING YOUR SHORT TO LIFE' : `STEP ${step + 1} OF 3`}</span>
            <h2 ref={heading} tabIndex={-1}>
              {(preparing || verifying) ? phaseTitles[phase] : ['Start with a moment.', 'Make it yours.', 'One last look.'][step]}
            </h2>
            <p>
              {(preparing || verifying) ? phaseCopy[phase] : [
                'A fresh idea, a tiny tutorial, a moment worth sharing. Make it yours.',
                'A little context helps the right people find your story.',
                'Happy with your Short? Let’s share it.',
              ][step]}
            </p>
          </div>
          {verifying && (
            <section className="su-processing" aria-label="Preparing upload">
              <LockKeyhole size={36} aria-hidden="true" />
              <p role="status">Getting ready to upload. Your video will continue automatically.</p>
            </section>
          )}
          {!verifying && (preparing ? (
            <section className="su-processing" aria-label="Upload progress">
              <div className="su-process-icon"><ScanEye size={36} aria-hidden="true" /></div>
              <div role="status">
                <strong>{uploading ? `${s.uploadProgress}% uploaded` : phaseTitles[phase]}</strong>
                <progress aria-label={phaseTitles[phase]} max={100} value={uploading ? s.uploadProgress : undefined} />
              </div>
              <ol>
                {['Check file', 'Upload privately', 'Prepare playback'].map((label, index) => (
                  <li key={label} className={index <= phase ? 'reached' : ''} aria-current={index === phase ? 'step' : undefined}>
                    {index < phase ? <CheckCircle2 size={18} aria-hidden="true" /> : <span className="su-process-dot" />}
                    {label}
                    <small>{phaseStatus(index)}</small>
                  </li>
                ))}
              </ol>
              {s.config?.visualModeration && (
              <p>
                <LockKeyhole size={15} aria-hidden="true" />
                {' '}
                Your video will only appear in the feed after review and after publication.
              </p>
              )}
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
                  <small>
                    {!file && 'MP4 or MOV · 2–60 seconds · Up to 40 MB · '}
                    Vertical 9:16 recommended
                  </small>
                </div>
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
                    <select id="short-topic" value={selectedTopic} onChange={(event) => setTopic(event.target.value)}>
                      <option value="" disabled>Choose a topic</option>
                      {topics.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label htmlFor="short-language">
                    Spoken language
                    <select id="short-language" value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  </label>
                </div>
                <small>Your topic helps discovery. We check the video and its labels during review.</small>
                <details className="su-captions" hidden>
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
                    <span>
                      AI-generated or substantially altered
                      <small>Adds an AI-altered label to your Short.</small>
                    </span>
                    <input id="short-synthetic" className="su-switch" type="checkbox" role="switch" checked={synthetic} disabled={s.busy} onChange={(event) => setSynthetic(event.target.checked)} />
                  </label>
                  <label htmlFor="short-sponsored">
                    <span>
                      Sponsored or paid promotion
                      <small>Makes your commercial relationship visible.</small>
                    </span>
                    <input id="short-sponsored" className="su-switch" type="checkbox" role="switch" checked={sponsored} disabled={s.busy} onChange={(event) => setSponsored(event.target.checked)} />
                  </label>
                </fieldset>
                <label className="su-rights" htmlFor="short-rights">
                  <input id="short-rights" type="checkbox" checked={rights} disabled={s.busy} onChange={(event) => setRights(event.target.checked)} />
                  <span>I have the rights to publish this video and its audio.</span>
                </label>
              </div>
              )}
              {step === 2 && (
                <UploadReview
                  video={{
                    title: title.trim(), description: description.trim(), topic: selectedTopic, synthetic, sponsored,
                  }}
                  busy={s.busy || publishing}
                  onEdit={() => go(1)}
                  languageLabel={languages.find(([code]) => code === language)?.[1] || 'No spoken language'}
                />
              )}
            </>
          ))}
          <div className="su-action-bar">
            <div className="su-actions">
              <ol className="su-steps" aria-label="Create a Short progress">
                {steps.map((label, index) => (
                  <li key={label} className={index === step ? 'current' : ''}>
                    <button type="button" aria-label={`${index + 1} ${label}`} aria-current={index === step ? 'step' : undefined} disabled={s.busy || !!s.uploadPublication || index > step} onClick={() => go(index)}>
                      <span>{index + 1}</span>
                      {label}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="su-action-buttons">
                {step > 0 && (
                <button type="button" disabled={s.busy || publishing} onClick={() => go(step - 1)}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  {' '}
                  Previous
                </button>
                )}
                <button type="submit" className="primary" disabled={disabled}>
                  {nextLabel}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </form>
        <aside id="su-preview" className="su-preview" aria-label="Short preview" inert={publishing}>
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
                  const media = event.currentTarget;
                  if (!Number.isFinite(media.duration) || media.duration < 2 || media.duration > 60) {
                    setFileError('Your video must be 2–60 seconds long. Choose another clip.'); setInfo(undefined); return;
                  }
                  setInfo({ duration: media.duration, width: media.videoWidth, height: media.videoHeight });
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
          {file && step < 2 && <small className="su-draft-note">Kept in this tab until you publish.</small>}
          {file && step < 2 && <small className="su-preview-filename">{file.name}</small>}
        </aside>
      </div>
      {publishing && <UploadPublishOverlay s={s} />}
    </div>
  );
};
