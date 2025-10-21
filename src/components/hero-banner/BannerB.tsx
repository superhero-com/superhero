import React from "react";
import BannerContent from "./BannerContent";

export default function BannerB() {
  return (
    <BannerContent
      title="Tokenize #trends. Trade the signal."
      description="#Trends are markets. Go long/short on culture and let prices surface what matters."
      chips={["Popularity signals", "Inline trading"]}
      primaryButtonText="Launch a #trend"
      primaryButtonLink="/trends/new"
      secondaryButtonText="Explore #trends"
      secondaryButtonLink="/trending"
    />
  );
}

