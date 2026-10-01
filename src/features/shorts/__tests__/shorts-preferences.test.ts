import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { defaultPreferences, rankShorts, useShortsPreferences } from '../shorts-preferences';
import type { Short } from '../types';

const make = (id: string, creator: string, topic = 'Art', createdAt = 100) => ({
  id, creator, topic, createdAt, status: 'active', language: 'en', likes: 0,
} as Short);
describe('local Shorts discovery', () => {
  it('filters eligibility, blocks and hidden videos before interest ranking', () => {
    const clips = [make('a', 'blocked'), { ...make('b', 'ok'), status: 'expired' }, make('c', 'ok'), make('d', 'ok', 'Nature')];
    expect(rankShorts(clips, {
      ...defaultPreferences, blocked: ['blocked'], hidden: ['c'], topics: ['Nature'],
    }).map((s) => s.id)).toEqual(['d']);
  });
  it('keeps Recent chronological and diversifies For You without payment influence', () => {
    const clips = [make('a', 'one', 'Art', 300), make('b', 'one', 'Art', 200), make('c', 'two', 'Art', 100)];
    expect(rankShorts(clips, defaultPreferences).map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(rankShorts(clips, { ...defaultPreferences, mode: 'recent' }).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(rankShorts(clips.map((s) => ({ ...s, likes: s.id === 'c' ? 9999 : 0 })), defaultPreferences).map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(clips).toHaveLength(3);
  });
  it('honors contract follows independently of local preferences, saved videos and language', () => {
    const clips = [make('a', 'one'), make('b', 'two'), { ...make('c', 'two'), language: 'fr' }];
    expect(rankShorts(clips, {
      ...defaultPreferences, mode: 'following', language: 'en',
    }, 'All', ['two']).map((s) => s.id)).toEqual(['b']);
    expect(rankShorts(clips, { ...defaultPreferences, mode: 'saved', saved: ['a'] }).map((s) => s.id)).toEqual(['a']);
  });
  it('ignores legacy browser follows and never saves them again or changes real follows on reset', () => {
    localStorage.setItem('superhero.shorts.preferences.v1', JSON.stringify({ followed: ['legacy'], saved: ['clip'], mode: 'following' }));
    const { result } = renderHook(useShortsPreferences);
    expect(result.current.preferences).not.toHaveProperty('followed');
    expect(result.current.preferences.saved).toEqual(['clip']);
    expect(rankShorts([make('clip', 'legacy')], result.current.preferences)).toEqual([]);
    act(() => result.current.update(defaultPreferences));
    expect(JSON.parse(localStorage.getItem('superhero.shorts.preferences.v1')!)).not.toHaveProperty('followed');
    expect(rankShorts([make('clip', 'real')], { ...result.current.preferences, mode: 'following' }, 'All', ['real'])).toHaveLength(1);
    localStorage.clear();
  });
});
