import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

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
      className="w-full max-w-full"
    >
      <Input
        id="global-search"
        name="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Superhero"
        className="w-full bg-secondary border-border text-foreground focus:border-accent focus:ring-accent/20 placeholder:text-muted-foreground"
      />
    </form>
  );
}
