import React from 'react';
import { useLocation } from 'react-router-dom';
import WebAppHeader from './WebAppHeader';
import MobileAppHeader from './MobileAppHeader';
import MobileAppFooter from './MobileAppFooter';

const AppHeader = () => {
  const { pathname } = useLocation();
  const studio = pathname === '/shorts/studio' || pathname.startsWith('/shorts/studio/');
  if (import.meta.env.DEV && import.meta.env.VITE_SHORTS_TESTNET_MVP === '1' && studio) return null;
  return (
    <>
      <WebAppHeader />
      <MobileAppHeader />
      <MobileAppFooter />
    </>
  );
};

export default AppHeader;
