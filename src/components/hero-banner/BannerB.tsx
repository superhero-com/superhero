import React from "react";
import BannerContent from "./BannerContent";

export default function BannerB() {
  return (
    <BannerContent
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

