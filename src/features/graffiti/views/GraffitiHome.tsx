import React from "react";
import MobileCard from "@/components/MobileCard";
import AeButton from "@/components/AeButton";
import { useNavigate } from "react-router-dom";
import logoSvg from "@/assets/graffiti/graffiti_logo.svg";
import heroGif from "@/assets/graffiti/5dca8eb572c3a570288364.gif";

export default function GraffitiHome() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Graffiti</h1>

      {/* Hero intro */}
      <MobileCard padding="large" className="mb-4">
        <div className="flex items-center gap-5">
          <img src={logoSvg} alt="Graffiti" className="h-[54px] w-auto hidden sm:block" />
          <div className="space-y-2 flex-1">
            <div className="text-lg">Art. On the Blockchain. Forever.</div>
            <p className="opacity-80 text-sm">
              Create on‑chain wall art with the æternity Graffiti drone. Upload an image, tune the neon vectorized
              style, position it on the wall and place a bid to include it—immutably.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <AeButton onClick={() => navigate('/graffiti/contribute')}>Get Started</AeButton>
              <AeButton variant="secondary" onClick={() => navigate('/graffiti/overview')}>Overview</AeButton>
              <AeButton variant="ghost" onClick={() => navigate('/graffiti/info')}>What is this?</AeButton>
            </div>
          </div>
          <img src={heroGif} alt="demo" className="h-[80px] w-auto hidden md:block rounded-md" />
        </div>
      </MobileCard>

      {/* Quick steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MobileCard padding="medium">
          <div className="text-sm opacity-70 mb-1">Step 1</div>
          <div className="font-semibold mb-1">Upload</div>
          <p className="opacity-80 text-sm">Pick any PNG or JPG. We’ll prep it for rendering.</p>
        </MobileCard>
        <MobileCard padding="medium">
          <div className="text-sm opacity-70 mb-1">Step 2</div>
          <div className="font-semibold mb-1">Transform</div>
          <p className="opacity-80 text-sm">Tune color, line smoothing and detail to your liking.</p>
        </MobileCard>
        <MobileCard padding="medium">
          <div className="text-sm opacity-70 mb-1">Step 3</div>
          <div className="font-semibold mb-1">Position & Bid</div>
          <p className="opacity-80 text-sm">Place your art on the wall and bid to make it part of the piece.</p>
        </MobileCard>
      </div>
    </div>
  );
}


