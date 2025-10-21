import React from "react";
import BannerSlide from "./BannerSlide";

export default function BannerC() {
  return (
    <BannerSlide
      backgroundGradient="radial-gradient(1100px 520px at 85% -20%, rgba(56,255,179,.22), transparent 60%), radial-gradient(900px 520px at -10% 80%, rgba(0,229,255,.18), transparent 60%), linear-gradient(120deg, #090c22, #201042, #0c0b26)"
      supernovaColor="rgba(0,229,255,.55)"
      title="From signal → treasury: Purpose DAOs. ⚙️💚"
      description="Trading fees auto-seed DAOs so trending ideas get budgets and milestones—no middlemen, no waiting."
      chips={["Fees → Treasury", "Grants & bounties", "Creator payouts"]}
      primaryButtonText="Start a Purpose-DAO"
      primaryButtonLink="/trends/create"
      secondaryButtonText="See funded work"
      secondaryButtonLink="/trends/daos"
    />
  );
}

