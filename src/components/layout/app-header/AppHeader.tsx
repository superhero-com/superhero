import React from 'react';
import WebAppHeader from './WebAppHeader';
import MobileAppHeader from './MobileAppHeader';
import { useLayoutVariant } from '../../../contexts/LayoutVariantContext';

export default function AppHeader() {
  const { variant } = useLayoutVariant();

  return (
    <>
      {/* Show WebAppHeader only in minimal mode where side navigation is hidden */}
      {variant === 'minimal' && <WebAppHeader />}
      <MobileAppHeader />
    </>
  );
}
