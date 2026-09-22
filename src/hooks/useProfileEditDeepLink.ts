import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export type ProfileEditSection = 'profile' | 'x';

const PARAM = 'edit';

/** Path for the owner's profile with the editor already open at `section`. */
export const profileEditPath = (address: string, section: ProfileEditSection = 'x') => (
  `/users/${encodeURIComponent(address)}?${PARAM}=${section}`
);

/**
 * `?edit=x` opens the profile editor on the X section. The "Link X" steps on
 * the feed and the rewards page link here, so the user lands on the one button
 * they came for rather than on a profile they then have to search.
 *
 * Waits for `canEdit` — the wallet may still be restoring on arrival — and then
 * drops the param with `replace`, so back and refresh do not reopen the dialog.
 * On someone else's profile `canEdit` never becomes true and the param is
 * ignored.
 */
export function useProfileEditDeepLink(
  canEdit: boolean,
  openEditor: (section: ProfileEditSection) => void,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get(PARAM);

  useEffect(() => {
    if (!canEdit) return;
    if (requested !== 'x' && requested !== 'profile') return;
    openEditor(requested);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(PARAM);
      return next;
    }, { replace: true });
  // openEditor is typically an inline arrow; keying on it would reopen the
  // dialog on every parent render until the param is gone.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, requested, setSearchParams]);
}
