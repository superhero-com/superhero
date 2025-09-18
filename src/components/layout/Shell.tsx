import React from 'react';
import FooterSection from './FooterSection';

export default function Shell({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen w-full max-w-[min(1536px,100%)] mx-auto flex flex-col">
        <div className="flex-grow grid grid-cols-1 gap-4 p-2 px-4 md:gap-3 md:p-2 md:px-3 lg:grid-cols-[1fr_360px] lg:gap-4 lg:p-2 lg:px-4 sm:gap-2 sm:p-1 sm:px-2">
          <main className="min-w-0 overflow-hidden">
            {children}
          </main>
          <aside className="hidden lg:block sticky top-16 self-start min-w-0">
            {right}
          </aside>
        </div>
      </div>
      <FooterSection />
    </>
  );
}


