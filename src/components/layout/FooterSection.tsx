import React from 'react';
import './FooterSection.scss';

export default function FooterSection() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="left">Superhero is Open Source</div>
        <nav className="right">
          <a href="/trendminer">TrendCloud</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="https://github.com/aeternity/superhero-ui" target="_blank" rel="noreferrer">Contribute on GitHub</a>
        </nav>
      </div>
    </footer>
  );
}


