import React from 'react';
import './FooterSection.scss';

export default function FooterSection() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="left">Superhero is Open Source</div>
        <nav className="right">
          <a href="/trendminer" style={{ marginRight: 14 }}>TrendCloud</a>
          <a href="/terms" style={{ marginRight: 14 }}>Terms</a>
          <a href="/privacy" style={{ marginRight: 14 }}>Privacy</a>
          <a href="https://github.com/aeternity/superhero-ui" target="_blank" rel="noreferrer">Contribute on GitHub</a>
        </nav>
      </div>
    </footer>
  );
}


