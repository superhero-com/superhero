import React, { useMemo, useRef, useState } from "react";
import MobileCard from "@/components/MobileCard";
import AeButton from "@/components/AeButton";
import { useAtom } from "jotai";
import { bidAtom, originalImageAtom, positionAtom, settingsAtom, transformedImageAtom } from "../state/atoms";
import { useNavigate } from "react-router-dom";

export default function GraffitiPositioning() {
  const navigate = useNavigate();
  const [pos, setPos] = useAtom(positionAtom);
  const [settings] = useAtom(settingsAtom);
  const [transformed] = useAtom(transformedImageAtom);
  const [original] = useAtom(originalImageAtom);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bid, setBid] = useAtom(bidAtom);
  const [scale, setScale] = useState(1);

  const previewSrc = useMemo(() => transformed.src || original.src, [transformed.src, original.src]);

  function adjustScale(delta: number) {
    const next = Math.max(0.2, Math.min(5, scale + delta));
    setScale(next);
  }

  function handleDrag(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setPos({ x: Math.round(x), y: Math.round(y) });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Place Your Artwork</h1>
      <MobileCard padding="large" className="mb-4">
        <div
          ref={containerRef}
          className="relative w-full h-[60vh] bg-black/20 rounded-lg overflow-hidden"
          onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
          onMouseDown={handleDrag}
        >
          {/* Wall background could be a fetched latest.svg later */}
          {previewSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="art"
              style={{ position: 'absolute', left: pos.x, top: pos.y, transform: `translate(-50%, -50%) scale(${scale})` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <AeButton variant="secondary" onClick={() => adjustScale(-0.1)}>-</AeButton>
            <AeButton variant="secondary" onClick={() => adjustScale(0.1)}>+</AeButton>
            <div className="opacity-70 text-sm">Scale: {scale.toFixed(1)}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Slot ID"
              value={bid.slotId ?? ''}
              onChange={(e) => setBid({ ...bid, slotId: Number(e.target.value) })}
              className="w-24 px-3 py-2 rounded-lg border border-white/10 bg-white/5"
            />
            <input
              type="number"
              placeholder="Amount (AE)"
              value={bid.amountAe ?? ''}
              onChange={(e) => setBid({ ...bid, amountAe: Number(e.target.value) })}
              className="w-36 px-3 py-2 rounded-lg border border-white/10 bg-white/5"
            />
            <AeButton onClick={() => navigate('/graffiti/confirm')}>Place Art</AeButton>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}


