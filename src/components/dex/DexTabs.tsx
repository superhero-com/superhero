import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`dex-tab ${active ? 'dex-tab--active' : ''}`}
    >
      {label}
    </button>
  );
}

export default function DexTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const isDex = path.startsWith('/dex') || path.startsWith('/swap');
  const isPool = path.startsWith('/pool');
  const isExplore = path.startsWith('/explore');

  return (
    <div className="dex-tabs">
      <Tab label="Dex" active={isDex} onClick={() => navigate('/dex')} />
      <Tab label="Pool" active={isPool} onClick={() => navigate('/pool')} />
      <Tab label="Explore" active={isExplore} onClick={() => navigate('/explore')} />
      <div className="dex-tabs__spacer" />
      <button
        onClick={() => navigate('/pool/add-tokens')}
        className="dex-tabs__add-button"
      >
        Add tokens
      </button>
    </div>
  );
}


