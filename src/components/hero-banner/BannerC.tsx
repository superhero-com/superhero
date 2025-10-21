import React from "react";
import BannerContent from "./BannerContent";

export default function BannerC() {
  return (
    <BannerContent
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

