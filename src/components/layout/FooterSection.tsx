import React from 'react';

export default function FooterSection() {
  return (
    <footer className="border-t mt-6 py-4 md:py-5 md:mt-8" style={{ borderTopColor: 'var(--search-nav-border-color)' }}>
      <div className="max-w-[min(1648px,100%)] mx-auto px-4 flex gap-4 items-center md:flex-col md:gap-4 md:px-4 md:text-center sm:px-3 sm:gap-3">
        <div className="text-sm md:order-2 md:text-[13px]" style={{ color: 'var(--light-font-color)' }}>Superhero is Open Source</div>
        <nav className="ml-auto flex gap-3 flex-wrap md:ml-0 md:order-1 md:justify-center md:gap-2 sm:gap-1.5">
          <a 
            href="/trendminer" 
            className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--custom-links-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--light-font-color)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            TrendCloud
          </a>
          <a 
            href="/terms" 
            className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--custom-links-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--light-font-color)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Terms
          </a>
          <a 
            href="/privacy" 
            className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--custom-links-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--light-font-color)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Privacy
          </a>
          <a 
            href="https://github.com/aeternity/superhero-ui" 
            target="_blank" 
            rel="noreferrer"
            className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--custom-links-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--light-font-color)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Contribute on GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}


