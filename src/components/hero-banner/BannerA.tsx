import React from "react";
import BannerContent from "./BannerContent";

export default function BannerA() {
  return (
    <BannerContent
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

