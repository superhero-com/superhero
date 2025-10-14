import React from "react";
import MobileCard from "@/components/MobileCard";
import AeButton from "@/components/AeButton";
import { useNavigate } from "react-router-dom";

export default function GraffitiHome() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Graffiti</h1>
      <MobileCard padding="large">
        <div className="space-y-3">
          <p className="opacity-80">
            Create on-chain wall art with the æternity Graffiti drone.
          </p>
          <div className="flex gap-3">
            <AeButton onClick={() => navigate('/graffiti/contribute')}>Get Started</AeButton>
            <AeButton variant="secondary" onClick={() => navigate('/graffiti/overview')}>Overview</AeButton>
            <AeButton variant="ghost" onClick={() => navigate('/graffiti/info')}>What is this?</AeButton>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}


