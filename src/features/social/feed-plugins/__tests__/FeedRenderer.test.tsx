import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedRenderer from '../FeedRenderer';
import { registerPlugin, resetPlugins } from '../registry';
import type { FeedEntry } from '../types';
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeedRenderer', () => {
  beforeEach(() => {
    resetPlugins();
  });

  it('renders via plugin when kind matches', () => {
    const TestComp = ({ entry }: { entry: FeedEntry<{ label: string }> }) => (
      <div data-testid="plugin-item">{entry.data.label}</div>
    );
    registerPlugin({ kind: 'x', Render: TestComp as any });

    const entry: FeedEntry<{ label: string }> = {
      id: 'x:1',
      kind: 'x',
      createdAt: new Date().toISOString(),
      data: { label: 'hello' },
    };
    render(<FeedRenderer entry={entry} onOpenPost={() => {}} />);
    expect(screen.getByTestId('plugin-item')).toHaveTextContent('hello');
  });
});


