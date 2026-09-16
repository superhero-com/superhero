import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProfileBand, { addressGradient } from '../ProfileBand';

const A = 'ak_alice0000000000000000000000000000000000000000000000';
const B = 'ak_bob00000000000000000000000000000000000000000000000';

describe('addressGradient', () => {
  it('is deterministic for a given address', () => {
    expect(addressGradient(A)).toBe(addressGradient(A));
  });

  it('differs between addresses', () => {
    expect(addressGradient(A)).not.toBe(addressGradient(B));
  });

  it('is a linear-gradient with no NaN', () => {
    const g = addressGradient(A);
    expect(g.startsWith('linear-gradient(')).toBe(true);
    expect(g.includes('NaN')).toBe(false);
  });
});

describe('ProfileBand', () => {
  it('renders a band carrying the derived gradient', () => {
    const { getByTestId } = render(<ProfileBand address={A} className="h-[86px]" />);
    const band = getByTestId('profile-band');
    expect(band.getAttribute('style')).toContain('linear-gradient');
    expect(band.className).toContain('h-[86px]');
  });
});
