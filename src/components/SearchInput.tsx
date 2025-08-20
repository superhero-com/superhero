import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function SearchInput() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const [q, setQ] = useState(params.get('search') || '');
  
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(search);
        if (q) next.set('search', q); else next.delete('search');
        navigate({ pathname: '/', search: `?${next.toString()}` });
      }}
      style={{ 
        width: '100%',
        maxWidth: '100%'
      }}
    >
      <input
        id="global-search"
        name="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Superhero"
        style={{ 
          background: 'var(--secondary-color)', 
          border: '1px solid var(--search-nav-border-color)', 
          borderRadius: '8px', 
          color: 'var(--standard-font-color)', 
          padding: '8px 12px',
          width: '100%',
          fontSize: '14px',
          outline: 'none',
          transition: 'all 0.2s ease',
          
          '&:focus': {
            borderColor: 'var(--custom-links-color)',
            boxShadow: '0 0 0 2px rgba(0, 255, 157, 0.2)'
          },
          
          '&::placeholder': {
            color: 'var(--light-font-color)'
          }
        }}
      />
    </form>
  );
}


