import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import Conference from '../Conference';

describe('Conference (Jitsi) (HARDEN-03 medium / HARDEN-06 sandboxed embed)', () => {
  const renderConference = (room = 'test-room') => render(
    <MemoryRouter initialEntries={[`/meet/${room}`]}>
      <Routes>
        <Route path="/meet/:room?" element={<Conference />} />
      </Routes>
    </MemoryRouter>,
  );

  it('renders the Jitsi iframe pointed at the configured room', () => {
    renderConference('test-room');
    const iframe = document.getElementById('jitsiConferenceFrame0') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('/test-room#');
  });

  it('carries a curated sandbox allowlist (previously fully unsandboxed)', () => {
    renderConference('test-room');
    const iframe = document.getElementById('jitsiConferenceFrame0') as HTMLIFrameElement;
    const tokens = (iframe.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);

    expect(tokens.length).toBeGreaterThan(0);
    ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups', 'allow-modals', 'allow-presentation']
      .forEach((token) => expect(tokens).toContain(token));

    // Never top-navigation: a Jitsi frame should not be able to redirect the whole
    // superhero.com tab away to an arbitrary URL.
    expect(tokens).not.toContain('allow-top-navigation');
  });
});
