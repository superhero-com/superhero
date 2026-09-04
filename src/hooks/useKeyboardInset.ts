/**
 * How much of the screen the on-screen keyboard is covering, and how much is
 * left above it — both read off the visual viewport, in CSS pixels.
 *
 * Chrome's default is `interactive-widget=resizes-visual`: opening the keyboard
 * shrinks the VISUAL viewport and leaves the LAYOUT viewport at full height. A
 * `position: fixed` sheet is laid out against the layout viewport, so it stays
 * anchored to the bottom of a screen the keyboard is covering, and whether the
 * focused field ends up visible is left to the browser's scroll-into-view
 * heuristics — which is why it lands sometimes and not others.
 *
 * Measuring the gap ourselves makes it deterministic. The alternative is the
 * global `interactive-widget=resizes-content`, which hands the whole job to the
 * browser but changes `window.innerHeight` app-wide — `MobileAppFooter` reads
 * exactly that to decide the keyboard is open, so it is not a one-line swap.
 *
 * `visibleHeight` ships alongside because callers need both, and mixing this
 * measurement with `100vh` does not work: `vh` is the LARGE viewport, sized as
 * if the browser chrome were retracted, so `100vh - inset` overshoots the real
 * gap by the height of a shown URL bar.
 */
import { useEffect, useState } from 'react';

export interface KeyboardInset {
  /** Pixels of the layout viewport the keyboard covers. 0 when it is closed. */
  inset: number;
  /** What is left visible above it. 0 when the keyboard is closed. */
  visibleHeight: number;
}

/** Below this, the change is browser chrome collapsing on scroll, not a keyboard. */
const KEYBOARD_MIN_HEIGHT = 120;

const CLOSED: KeyboardInset = { inset: 0, visibleHeight: 0 };

export function useKeyboardInset(): KeyboardInset {
  const [value, setValue] = useState<KeyboardInset>(CLOSED);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const update = () => {
      // `offsetTop` counts the part already scrolled out of view, so the gap is
      // what remains below the visual viewport — the keyboard.
      const covered = window.innerHeight - (viewport.height + viewport.offsetTop);
      const next: KeyboardInset = covered > KEYBOARD_MIN_HEIGHT
        ? { inset: Math.round(covered), visibleHeight: Math.round(viewport.height) }
        : CLOSED;
      // Same object back when nothing moved: this runs on every scroll event,
      // and a fresh object each time would re-render every consumer.
      setValue((prev) => (
        prev.inset === next.inset && prev.visibleHeight === next.visibleHeight ? prev : next
      ));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return value;
}

export default useKeyboardInset;
