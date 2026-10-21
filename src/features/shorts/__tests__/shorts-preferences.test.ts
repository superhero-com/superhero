import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { defaultPreferences, rankShorts, useShortsPreferences } from '../shorts-preferences';
import type { Short } from '../types';

const make = (id: string, creator: string, topic = 'Art', createdAt = 100) => ({
  id, creator, topic, createdAt, status: 'active', language: 'en', likes: 0,
} as Short);
describe('local Shorts discovery', () => {
  it('drops the legacy measurement flag without discarding saved discovery preferences', () => {
    localStorage.setItem('superhero.shorts.preferences.v1', JSON.stringify({ measured: false, topics: ['Art'], saved: ['clip'] }));
    const { result } = renderHook(useShortsPreferences);
    expect(result.current.preferences).not.toHaveProperty('measured');
    expect(result.current.preferences.topics).toEqual(['Art']);
    expect(result.current.preferences.saved).toEqual(['clip']);
    act(() => result.current.update({ language: 'en' }));
    expect(JSON.parse(localStorage.getItem('superhero.shorts.preferences.v1')!)).not.toHaveProperty('measured');
    localStorage.clear();
  });
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
  it('uses recent watch quality only in For You while keeping interests stronger and a place for new videos', () => {
    const now = 10 * 86400000;
    const clips = [
      { ...make('skip', 'one', 'Art', now), engagement: { score: 0.2 } },
      { ...make('complete', 'two', 'Art', now), engagement: { score: 0.8 } },
      { ...make('interest', 'three', 'Nature', now - 86400000), engagement: { score: 0.2 } },
    ];
    expect(rankShorts(clips, defaultPreferences, 'All', [], now)[0].id).toBe('complete');
    expect(rankShorts(clips, { ...defaultPreferences, topics: ['Nature'] }, 'All', [], now)[0].id).toBe('interest');
    expect(rankShorts(clips, { ...defaultPreferences, mode: 'recent' }, 'All', [], now)[0].id).toBe('skip');
    expect(rankShorts([
      { ...make('old', 'one', 'Art', now - 90 * 86400000), engagement: { score: 0.8 } },
      make('new', 'two', 'Art', now),
    ], defaultPreferences, 'All', [], now)[0].id).toBe('new');
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
