import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

// The detachable node is the assertion target, so these check DOM shape, not text.
const bareText = (el: Element) => Array.from(el.childNodes)
  .filter((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim())
  .map((n) => n.textContent);

const buttonIn = (c: HTMLElement) => c.querySelector('button')!;

describe('translationSafeChildren', () => {
  it('wraps a label rendered beside an icon', () => {
    const { container } = render(
      <Button>
        <svg />
        Unlock chat
      </Button>,
    );
    expect(bareText(buttonIn(container))).toEqual([]);
    expect(buttonIn(container).textContent).toBe('Unlock chat');
  });

  it('wraps a label inside a fragment, which mounts on the button all the same', () => {
    const { container } = render(
      <Button>
        <>
          <svg />
          Unlocking…
        </>
      </Button>,
    );
    expect(bareText(buttonIn(container))).toEqual([]);
    expect(buttonIn(container).textContent).toBe('Unlocking…');
  });

  it('merges adjacent text so the flex item count is unchanged', () => {
    const { container } = render(
      <Button>
        ←
        {' '}
        Back
      </Button>,
    );
    const btn = buttonIn(container);
    expect(bareText(btn)).toEqual([]);
    expect(btn.children).toHaveLength(1);
    expect(btn.textContent).toBe('← Back');
  });

  it('keeps a label a separate item from the icon it sits beside', () => {
    const { container } = render(
      <Button>
        <svg />
        {' '}
        Download
      </Button>,
    );
    const btn = buttonIn(container);
    expect(bareText(btn)).toEqual([]);
    expect(Array.from(btn.children).map((c) => c.tagName.toLowerCase())).toEqual(['svg', 'span']);
  });

  it('leaves asChild alone, where Slot requires a single element child', () => {
    const { container } = render(
      <Button asChild><a href="/x">Open</a></Button>,
    );
    const link = container.querySelector('a')!;
    expect(link.textContent).toBe('Open');
    expect(container.querySelector('button')).toBeNull();
  });
});
