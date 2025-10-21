import React from "react";
import BannerContent from "./BannerContent";

export default function BannerA() {
  return (
    <BannerContent
      title="Post on‑chain. Tip instantly."
      description="Share posts that settle on‑chain. Readers tip inline; creators get receipts automatically."
      chips={["Inline tipping", "On‑chain receipts"]}
      primaryButtonText="Start posting"
      primaryButtonLink="/social?post=new"
      secondaryButtonText="How it works"
      secondaryButtonLink="/faq"
    />
  );
}

