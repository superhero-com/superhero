import React from "react";
import BannerSlide from "./BannerSlide";

export default function BannerB() {
  return (
    <BannerSlide
      backgroundGradient="radial-gradient(1100px 520px at 85% -20%, rgba(122,92,255,.26), transparent 60%), radial-gradient(900px 520px at -10% 80%, rgba(0,229,255,.18), transparent 60%), linear-gradient(120deg, #070b1a, #0f1a3c, #110a2c)"
      supernovaColor="rgba(56,255,179,.55)"
      title="An information market for culture. 🔎💹"
      description="Prices aren't just hype—they're signals. #Trends aggregate belief in real time so the best ideas surface fast."
      chips={["Signal over noise", "Market discovers value", "Transparent treasuries"]}
      primaryButtonText="Trade the signal"
      primaryButtonLink="/trends/tokens"
      secondaryButtonText="View live markets"
      secondaryButtonLink="/trends"
    />
  );
}

