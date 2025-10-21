import React from "react";
import BannerContent from "./BannerContent";

export default function BannerC() {
  return (
    <BannerContent
      title="From signal → treasury: Purpose‑DAOs."
      description="Buy fees on #trends auto‑seed DAOs so the best ideas get budgets and milestones."
      chips={["Fees → Treasury", "Creator payouts"]}
      primaryButtonText="Start a Purpose‑DAO"
      primaryButtonLink="/dao/new"
      secondaryButtonText="See DAOs"
      secondaryButtonLink="/trends/daos"
    />
  );
}

