import React from 'react';
import WebAppHeader from './WebAppHeader';
import MobileAppHeader from './MobileAppHeader';

export default function AppHeader() {
  return (
    <>
      {/* Hide WebAppHeader - navigation is now in the left rail */}
      {/* <WebAppHeader /> */}
      <MobileAppHeader />
    </>
  );
}
