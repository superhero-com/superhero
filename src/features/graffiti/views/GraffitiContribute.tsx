import React from "react";
import MobileCard from "@/components/MobileCard";
import ImageUploader from "../components/ImageUploader";
import { useAtom } from "jotai";
import { originalImageAtom } from "../state/atoms";
import AeButton from "@/components/AeButton";
import { useNavigate } from "react-router-dom";

export default function GraffitiContribute() {
  const [original] = useAtom(originalImageAtom);
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Contribute</h1>
      <MobileCard padding="large">
        <div className="space-y-4">
          <p className="opacity-80">Upload an image and configure rendering settings.</p>
          <ImageUploader />
          {original.src && (
            <div className="mt-4">
              <div className="text-sm opacity-70 mb-2">Preview ({original.width}×{original.height})</div>
              <img src={original.src} alt="preview" className="max-w-full rounded-lg border border-white/10" />
              <div className="mt-4">
                <AeButton onClick={() => navigate('/graffiti/overview')}>Continue</AeButton>
              </div>
            </div>
          )}
        </div>
      </MobileCard>
    </div>
  );
}


