import React from "react";
import BannerSlide from "./BannerSlide";

export default function BannerD() {
  return (
    <BannerSlide
      backgroundGradient="radial-gradient(1100px 520px at 85% -20%, rgba(255,94,188,.24), transparent 60%), radial-gradient(900px 520px at -10% 80%, rgba(0,229,255,.18), transparent 60%), linear-gradient(120deg, #070a18, #15143a, #0e0b27)"
      supernovaColor="rgba(122,92,255,.55)"
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

