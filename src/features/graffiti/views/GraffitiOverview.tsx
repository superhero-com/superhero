import React, { useMemo, useState } from "react";
import MobileCard from "@/components/MobileCard";
import AeButton from "@/components/AeButton";
import { useAtom } from "jotai";
import { originalImageAtom, settingsAtom, transformedImageAtom } from "../state/atoms";
import { useNavigate } from "react-router-dom";

export default function GraffitiOverview() {
  const navigate = useNavigate();
  const [original] = useAtom(originalImageAtom);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [transformed, setTransformed] = useAtom(transformedImageAtom);
  const [editing, setEditing] = useState(false);

  const previewSrc = useMemo(() => transformed.src || original.src, [transformed.src, original.src]);

  function updatePreview() {
    if (!original.src) return;
    // MVP: reuse the original image as preview and estimate dimensions/time based on scale & stroke
    const width = Math.round((original.width || 0) * (settings.scaleFactor / 2));
    const height = Math.round((original.height || 0) * (settings.scaleFactor / 2));
    const estimatedMinutes = Math.max(1, Math.round((width * height) / Math.max(1, settings.strokeWidth * 8000)));
    setTransformed({ src: original.src, width, height, progress: 100, dronetime: estimatedMinutes });
    setEditing(false);
  }

  if (!original.src) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">Overview</h1>
        <MobileCard padding="large">
          <div className="space-y-3">
            <p className="opacity-80">No image selected yet.</p>
            <AeButton onClick={() => navigate('/graffiti/contribute')}>Select Image</AeButton>
          </div>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Overview</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MobileCard padding="large" className="lg:col-span-2">
          <div className="space-y-3">
            <div className="text-sm opacity-70">Preview</div>
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="preview" className="w-full rounded-lg border border-white/10" />
            ) : (
              <div className="opacity-60">No preview available</div>
            )}
          </div>
        </MobileCard>

        <MobileCard padding="large">
          <div className="space-y-4">
            <div className="text-sm opacity-70">Appearance</div>
            <div className="flex items-center justify-between gap-3">
              <label className="opacity-80">Color</label>
              <input
                type="color"
                value={settings.color}
                onChange={(e) => setSettings({ ...settings, color: e.target.value })}
              />
            </div>
            <div>
              <label className="opacity-80 text-sm">Stroke Width: {settings.strokeWidth}</label>
              <input
                type="range"
                min={50}
                max={300}
                step={10}
                value={settings.strokeWidth}
                onChange={(e) => setSettings({ ...settings, strokeWidth: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="opacity-80">Illustration Mode</label>
              <input
                type="checkbox"
                checked={settings.centerline}
                onChange={(e) => setSettings({ ...settings, centerline: e.target.checked })}
              />
            </div>
            {editing && (settings.centerline ? (
              <>
                <div>
                  <label className="opacity-80 text-sm">Line Smoothing: {settings.dilationRadius}</label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={settings.dilationRadius}
                    onChange={(e) => setSettings({ ...settings, dilationRadius: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="opacity-80 text-sm">Details: {settings.binaryThreshold}</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.binaryThreshold}
                    onChange={(e) => setSettings({ ...settings, binaryThreshold: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="opacity-80 text-sm">Line Smoothing: {settings.blurKernel}</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={settings.blurKernel}
                    onChange={(e) => setSettings({ ...settings, blurKernel: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="opacity-80 text-sm">Details: {settings.hysteresisHighThreshold}</label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={settings.hysteresisHighThreshold}
                    onChange={(e) => setSettings({ ...settings, hysteresisHighThreshold: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </>
            ))}

            <div className="flex gap-3">
              <AeButton variant="secondary" onClick={() => setEditing(!editing)}>Edit Artwork</AeButton>
              <AeButton onClick={updatePreview}>Update Preview</AeButton>
            </div>
            {transformed.dronetime > 0 && (
              <div className="text-sm opacity-80">Estimated time: {transformed.dronetime} min</div>
            )}
            <div className="pt-2">
              <AeButton onClick={() => navigate('/graffiti/positioning')}>Set Position</AeButton>
            </div>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}


