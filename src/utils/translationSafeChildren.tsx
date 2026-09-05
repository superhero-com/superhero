import React from 'react';

const isText = (node: React.ReactNode): node is string | number => (
  typeof node === 'string' || typeof node === 'number'
);

function mergeAdjacentText(children: React.ReactNode): React.ReactNode[] {
  const merged: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    const last = merged[merged.length - 1];
    if (isText(child) && isText(last)) merged[merged.length - 1] = `${last}${child}`;
    else merged.push(child);
  });
  return merged;
}

/**
 * Wrap text children in a `<span>`.
 *
 * Chrome's translator swaps each translated text node for a `<font>`. A bare text
 * node beside an element React inserts into is React's insertion reference, so the
 * next `insertBefore` throws `NotFoundError` and the app-wide ErrorBoundary blanks
 * the page — an icon becoming a spinner next to a label is enough.
 *
 * Adjacent text merges into one span: CSS already made it one anonymous flex item,
 * so a span each would add a `gap` inside `←{' '}{t('back')}`.
 *
 * Not used under `asChild` (Radix `Slot` takes one element child), and blind to a
 * bare string a child component returns.
 */
export function translationSafeChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(mergeAdjacentText(children), (child) => {
    if (isText(child)) return <span>{child}</span>;
    // A fragment is one opaque child to `Children.map`, but its contents mount
    // as direct children of the same parent, so they need the same wrap.
    if (React.isValidElement(child) && child.type === React.Fragment) {
      const { children: inner } = child.props as { children?: React.ReactNode };
      return React.cloneElement(child, undefined, translationSafeChildren(inner));
    }
    return child;
  });
}

export default translationSafeChildren;
