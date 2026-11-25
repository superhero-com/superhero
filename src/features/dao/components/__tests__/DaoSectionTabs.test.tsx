import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import DaoSectionTabs from '../DaoSectionTabs';

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <DaoSectionTabs />
    </MemoryRouter>,
  );
}

describe('DaoSectionTabs', () => {
  it('marks token DAOs as the current section on the DAO list', () => {
    renderAt('/trends/daos');

    expect(screen.getByRole('link', { name: 'Token DAOs' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'æternity polls' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the polls section current on a poll page', () => {
    renderAt('/voting/p/ct_poll');

    expect(screen.getByRole('link', { name: 'æternity polls' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Token DAOs' })).toHaveAttribute('href', '/trends/daos');
  });
});
