import { useState } from 'react';
import type { Short } from './types';

export type FeedMode = 'for-you' | 'following' | 'recent' | 'saved';
export interface Preferences {
  mode: FeedMode; topics: string[]; language: string;
  blocked: string[]; hidden: string[]; saved: string[];
}
export const defaultPreferences: Preferences = {
  mode: 'for-you', topics: [], language: 'all', blocked: [], hidden: [], saved: [],
};
const key = 'superhero.shorts.preferences.v1';
export function rankShorts(feed: Short[], prefs: Preferences, topic = 'All', followed: readonly string[] = [], now = Date.now()): Short[] {
  const eligible = feed.filter((s) => s.status === 'active' && !prefs.blocked.includes(s.creator)
    && !prefs.hidden.includes(s.id) && (prefs.language === 'all' || s.language === prefs.language)
    && (prefs.mode !== 'following' || followed.includes(s.creator))
    && (prefs.mode !== 'saved' || prefs.saved.includes(s.id)));
  const score = (s: Short) => (prefs.mode === 'for-you'
    ? (prefs.topics.includes(s.topic) ? 4 : 0) + (followed.includes(s.creator) ? 2 : 0)
      + (Number.isFinite(s.engagement?.score) ? Math.max(0, Math.min(1, s.engagement!.score)) : 0.5)
      + 0.5 / (1 + Math.max(0, now - (s.createdAt || 0)) / (3 * 86400000)) : 0)
    + (topic !== 'All' && s.topic === topic ? 8 : 0);
  const sorted = [...eligible].sort((a, b) => score(b) - score(a) || (b.createdAt || 0) - (a.createdAt || 0) || a.id.localeCompare(b.id));
  // Never use payments or wallet balances as ranking inputs.
  const diverse: Short[] = [];
  while (sorted.length) {
    const next = sorted.findIndex((s) => s.creator !== diverse[diverse.length - 1]?.creator);
    diverse.push(sorted.splice(Math.max(0, next), 1)[0]);
  }
  return prefs.mode === 'recent' ? eligible.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : diverse;
}
export function useShortsPreferences() {
  const [preferences, set] = useState<Preferences>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      return {
        ...defaultPreferences,
        ...Object.fromEntries(['topics', 'blocked', 'hidden', 'saved'].map((field) => [field, Array.isArray(saved[field]) ? saved[field].filter((s: unknown) => typeof s === 'string').slice(0, 1000) : []])),
        mode: ['for-you', 'following', 'recent', 'saved'].includes(saved.mode) ? saved.mode : 'for-you',
        language: typeof saved.language === 'string' ? saved.language : 'all',
      };
    } catch { return defaultPreferences; }
  });
  const update = (patch: Partial<Preferences>) => set((previous) => {
    const next = { ...previous, ...patch };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* This session still works when storage is unavailable. */ }
    return next;
  });
  const toggle = (field: 'saved' | 'topics', value: string) => update({
    [field]: preferences[field].includes(value) ? preferences[field].filter((v) => v !== value) : [...preferences[field], value].slice(-1000),
  });
  return { preferences, update, toggle };
}
