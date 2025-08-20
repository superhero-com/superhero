import React from 'react';
import './Shell.scss';
import FooterSection from './FooterSection';

export default function Shell({ left, right, children }: { left?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <div className="shell">
        <div className="row">
          <aside className="left-section">{left}</aside>
          <main className="main">{children}</main>
          <aside className="right-section">{right}</aside>
        </div>
      </div>
      <FooterSection />
    </>
  );
}


