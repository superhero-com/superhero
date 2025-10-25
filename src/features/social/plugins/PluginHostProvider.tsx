import React, { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ComposerActionCtx } from '@/plugin-sdk';

const Ctx = createContext<ComposerActionCtx | null>(null);

export function PluginHostProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const ctx = useMemo<ComposerActionCtx>(() => ({
    insertText: () => {},
    navigate: (to) => navigate(to),
    storage: {
      get: (k) => {
        try { return JSON.parse(localStorage.getItem(`sh:plugin:${k}`) || 'null'); } catch { return null; }
      },
      set: (k, v) => {
        try { localStorage.setItem(`sh:plugin:${k}`, JSON.stringify(v)); } catch {}
      },
    },
    theme: { colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' },
    events: {
      emit: (e, p) => window.dispatchEvent(new CustomEvent(`sh:plugin:${e}`, { detail: p })),
      on: (e, h) => {
        const fn = (ev: any) => h(ev.detail);
        window.addEventListener(`sh:plugin:${e}`, fn as any);
        return () => window.removeEventListener(`sh:plugin:${e}`, fn as any);
      },
    },
  }), [navigate]);
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export const usePluginHostCtx = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('PluginHostProvider not mounted');
  return v;
};


