import React from 'react';
import './AppHeader.scss';
import WebAppHeader from './WebAppHeader';
import MobileAppHeader from './MobileAppHeader';

export default function AppHeader() {
  return (
    <>
      <WebAppHeader />
      <MobileAppHeader />
    </>
  );
}
