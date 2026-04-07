import React from 'react';
import WebAppHeader from './WebAppHeader';
import MobileAppHeader from './MobileAppHeader';
import MobileAppFooter from './MobileAppFooter';

const AppHeader = () => (
  <>
    <WebAppHeader />
    <MobileAppHeader />
    <MobileAppFooter />
  </>
);

export default AppHeader;
