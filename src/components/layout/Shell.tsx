import React from 'react';
import FooterSection from './FooterSection';

export default function Shell({ left, right, children }: { left?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen w-full max-w-[1648px] mx-auto flex flex-col md:max-w-full md:p-0">
        <div className="flex-grow grid grid-cols-1 gap-4 p-2 px-4 md:grid-cols-[220px_1fr] md:gap-3 md:p-2 md:px-3 lg:grid-cols-[380px_1fr_360px] lg:gap-4 lg:p-2 lg:px-4 sm:gap-2 sm:p-1 sm:px-2">
          <aside className="hidden md:block sticky top-16 self-start min-w-0 md:static md:order-1 lg:sticky lg:top-16 lg:order-1">
            {left}
          </aside>
          <main className="min-w-0 overflow-hidden md:order-2 lg:order-2">
            {children}
          </main>
          <aside className="hidden lg:block sticky top-16 self-start min-w-0 md:static md:order-3 lg:order-3">
            {right}
          </aside>
        </div>
      </div>
      <FooterSection />
    </>
  );
}


