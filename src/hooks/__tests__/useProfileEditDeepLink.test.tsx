import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import { profileEditPath, useProfileEditDeepLink } from '../useProfileEditDeepLink';

function setup(initialPath: string, canEdit: boolean) {
  const openEditor = vi.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
  const view = renderHook(
    ({ edit }) => {
      useProfileEditDeepLink(edit, openEditor);
      return useLocation();
    },
    { wrapper, initialProps: { edit: canEdit } },
  );
  return { ...view, openEditor };
}

describe('profileEditPath', () => {
  it('builds the owner profile URL with the editor section', () => {
    expect(profileEditPath('ak_2abc')).toBe('/users/ak_2abc?edit=x');
    expect(profileEditPath('ak_2abc', 'profile')).toBe('/users/ak_2abc?edit=profile');
  });
});

describe('useProfileEditDeepLink', () => {
  it('opens the editor at the X section and drops the param', () => {
    const { result, openEditor } = setup('/users/ak_me?edit=x&tab=feed', true);

    expect(openEditor).toHaveBeenCalledTimes(1);
    expect(openEditor).toHaveBeenCalledWith('x');
    // Gone, so back/refresh doesn't reopen it — and unrelated params survive.
    expect(result.current.search).toBe('?tab=feed');
  });

  it('waits for canEdit while the wallet restores, then opens once', () => {
    const { result, openEditor, rerender } = setup('/users/ak_me?edit=x', false);
    expect(openEditor).not.toHaveBeenCalled();
    expect(result.current.search).toBe('?edit=x');

    rerender({ edit: true });
    expect(openEditor).toHaveBeenCalledTimes(1);
    expect(result.current.search).toBe('');

    rerender({ edit: true });
    expect(openEditor).toHaveBeenCalledTimes(1);
  });

  it("never opens on someone else's profile", () => {
    const { openEditor } = setup('/users/ak_someone_else?edit=x', false);
    expect(openEditor).not.toHaveBeenCalled();
  });

  it('ignores an unknown section', () => {
    const { result, openEditor } = setup('/users/ak_me?edit=wallet', true);
    expect(openEditor).not.toHaveBeenCalled();
    expect(result.current.search).toBe('?edit=wallet');
  });
});
