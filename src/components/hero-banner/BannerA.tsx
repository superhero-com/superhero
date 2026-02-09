import React from 'react';
import BannerContent from './BannerContent';

interface BannerAProps {
  onStartPosting?: () => void;
}

export default function BannerA({ onStartPosting }: BannerAProps) {
  return (
    <BannerContent
      title="Post on‑chain. Tip instantly."
      description="Share posts that settle on‑chain. Readers tip inline; creators get receipts automatically."
      chips={['Inline tipping', 'On‑chain receipts']}
      primaryButtonText="Start posting"
      primaryButtonOnClick={onStartPosting}
      secondaryButtonText="How it works"
      secondaryButtonLink="/faq"
    />
  );
}
