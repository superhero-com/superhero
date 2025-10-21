import React from "react";
import BannerSlide from "./BannerSlide";

export default function BannerA() {
  return (
    <BannerSlide
      backgroundGradient="radial-gradient(1100px 520px at 85% -20%, rgba(0,229,255,.24), transparent 60%), radial-gradient(900px 520px at -10% 80%, rgba(0,229,255,.18), transparent 60%), linear-gradient(120deg, #080c1c, #1b0c36, #0d0b28)"
      supernovaColor="rgba(255,94,188,.55)"
      title="Play the popularity game—own the upside. 🎮📈"
      description="#Trend markets turn culture into a game you can play: buy early, sell late, and let prices signal what matters now."
      chips={["Popularity signals", "Inline trading", "On-chain receipts"]}
      primaryButtonText="Explore #trends"
      primaryButtonLink="/trends/tokens"
      secondaryButtonText="How it works"
      secondaryButtonLink="/faq"
    />
  );
}

