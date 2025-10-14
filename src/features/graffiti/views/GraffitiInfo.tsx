import React from "react";
import MobileCard from "@/components/MobileCard";
import AeButton from "@/components/AeButton";
import { useNavigate } from "react-router-dom";

// Assets pulled from the Vue aepp so wording/visuals match
// These live under src/features/aepp-graffiti/aepp/src/assets
import logoSvg from "@/assets/graffiti/graffiti_logo.svg";
import heroGif from "@/assets/graffiti/5dca8eb572c3a570288364.gif";
import satoshiSvg from "@/assets/graffiti/satoshi.svg";
import latestSvg from "@/assets/graffiti/latest.svg";
import step1Png from "@/assets/graffiti/step1.png";
import step2Png from "@/assets/graffiti/step2.png";
import step3Png from "@/assets/graffiti/step3.png";

export default function GraffitiInfo() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <div className="text-center space-y-6">
        <img src={logoSvg} alt="Graffiti" style={{ display: 'inline-block', maxHeight: 120 }} />
        <h1 className="text-3xl md:text-5xl font-extrabold">Graffiti on æternity</h1>
        <h2 className="text-xl md:text-3xl opacity-90">Art. On the Blockchain. Forever.</h2>
        <AeButton onClick={() => navigate('/graffiti/contribute')}>Get Started</AeButton>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <MobileCard padding="large">
            <h3 className="text-2xl mb-2">Open Source. No censorship.</h3>
            <p className="opacity-80">
              This new creative medium enables the global community to create a graffiti built on a
              decentralized, uncensored, transparent blockchain where the work will remain indefinitely,
              open to all.
            </p>
          </MobileCard>
        </div>
        <div className="flex items-center justify-center">
          <img src={heroGif} alt="demo" className="max-h-[320px] object-contain" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="flex items-center justify-center order-2 md:order-1">
          <img src={satoshiSvg} alt="art" className="max-h-[360px] object-cover" />
        </div>
        <div className="order-1 md:order-2">
          <MobileCard padding="large">
            <h3 className="text-2xl mb-2">Unique Artstyle</h3>
            <p className="opacity-80">
              We worked with artists to define a neon‑inspired vectorized art style that all images are converted to.
              Tune a set of parameters to make your image unique.
            </p>
          </MobileCard>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <MobileCard padding="large">
            <h3 className="text-2xl mb-2">Collaboration is key.</h3>
            <p className="opacity-80">
              This artwork thrives on collaboration. Make images work together, tell a story or remix an existing piece.
            </p>
            <div className="pt-3">
              <AeButton onClick={() => navigate('/graffiti/contribute')}>Get Started</AeButton>
            </div>
          </MobileCard>
        </div>
        <div className="flex items-center justify-center">
          <img src={latestSvg} alt="latest" className="max-h-[360px] object-cover" />
        </div>
      </div>

      <div className="space-y-5">
        <h3 className="text-2xl">Everyone can do it</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <MobileCard padding="large">
            <img src={step1Png} alt="step1" className="rounded-lg" />
            <div className="mt-4">
              <h4 className="text-xl mb-1">Step 1</h4>
              <p className="opacity-80">Open the Graffiti app and upload any image.</p>
            </div>
          </MobileCard>
          <MobileCard padding="large">
            <img src={step2Png} alt="step2" className="rounded-lg" />
            <div className="mt-4">
              <h4 className="text-xl mb-1">Step 2</h4>
              <p className="opacity-80">Transform it—tune parameters and explore possibilities.</p>
            </div>
          </MobileCard>
          <MobileCard padding="large">
            <img src={step3Png} alt="step3" className="rounded-lg" />
            <div className="mt-4">
              <h4 className="text-xl mb-1">Step 3</h4>
              <p className="opacity-80">Position your image and place a bid. If successful, your art becomes part of the wall—forever.</p>
            </div>
          </MobileCard>
        </div>
      </div>
    </div>
  );
}


