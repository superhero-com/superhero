import React from "react";
import BannerContent from "./BannerContent";

export default function BannerD() {
  return (
    <BannerContent
      title="Back creators at the speed of culture. 🚀"
      description="Tip posts instantly, trade #trends inline, and route a slice to DAOs that fund the originators."
      chips={["One-tap tips", "Trend markets", "Auto creator rewards"]}
      primaryButtonText="Start tipping"
      primaryButtonLink="/"
      secondaryButtonText="Launch a #trend"
      secondaryButtonLink="/trends/create"
    />
  );
}

