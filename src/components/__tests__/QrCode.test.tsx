import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toString as qrToString } from 'qrcode';

import QrCode from '../QrCode';

const ADDRESS = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';

/** `M{x} {y}h{n}` … `m{dx} 0h{n}` — one horizontal run of dark modules. */
const ROW_RE = /M([\d.]+) ([\d.]+)h(\d+)((?:m[\d.]+ 0h\d+)*)/g;
const RUN_RE = /m([\d.]+) 0h(\d+)/g;

/**
 * Dark modules of `qrcode`'s own SVG renderer, as an "x,y" set.
 *
 * That renderer walks the matrix independently of ours, so agreeing with it
 * pins the orientation and the quiet-zone offset. A transposed or shifted
 * matrix still *looks* like a QR code and still passes every shape assertion —
 * it just doesn't scan.
 */
function libraryModules(value: string): Set<string> {
  let svg = '';
  qrToString(value, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' }, (err, out) => {
    if (err) throw err;
    svg = out;
  });

  const modules = new Set<string>();
  const d = svg.match(/<path stroke="[^"]*" d="([^"]+)"/)?.[1] || '';

  for (let row = ROW_RE.exec(d); row; row = ROW_RE.exec(d)) {
    const y = Number(row[2]) - 0.5; // strokes are centred on the module row
    let x = Number(row[1]);
    let length = Number(row[3]);
    const add = () => {
      for (let i = 0; i < length; i += 1) modules.add(`${x + i},${y}`);
      x += length;
    };
    add();
    for (let run = RUN_RE.exec(row[4]); run; run = RUN_RE.exec(row[4])) {
      x += Number(run[1]);
      length = Number(run[2]);
      add();
    }
  }
  return modules;
}

/** Dark modules of our own `<path>`, as an "x,y" set. */
function renderedModules(d: string): Set<string> {
  return new Set([...d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(([, x, y]) => `${x},${y}`));
}

describe('QrCode', () => {
  it('renders a square SVG whose viewBox includes the quiet zone', () => {
    render(<QrCode value={ADDRESS} size={160} title="address qr" />);

    const svg = screen.getByTestId('qr-code');
    const [, , width, height] = (svg.getAttribute('viewBox') || '').split(' ').map(Number);

    expect(width).toBe(height);
    // Smallest QR version is 21 modules; +2 quiet modules a side.
    expect(width).toBeGreaterThanOrEqual(25);
    expect(svg).toHaveAttribute('width', '160');
  });

  it('draws one unit square per dark module', () => {
    const { container } = render(<QrCode value={ADDRESS} />);

    const d = container.querySelector('path')?.getAttribute('d') || '';
    const squares = d.match(/h1v1h-1z/g) || [];

    // A finder pattern alone is 7x7; any real symbol has far more than that.
    expect(squares.length).toBeGreaterThan(100);
    expect(d.startsWith('M')).toBe(true);
  });

  it('places every module where the encoder puts it', () => {
    const { container } = render(<QrCode value={ADDRESS} />);
    const ours = renderedModules(container.querySelector('path')?.getAttribute('d') || '');
    const theirs = libraryModules(ADDRESS);

    expect(theirs.size).toBeGreaterThan(100);
    expect([...ours].sort()).toEqual([...theirs].sort());
  });

  it('encodes different payloads differently', () => {
    const { container: a } = render(<QrCode value={ADDRESS} />);
    const { container: b } = render(<QrCode value={`${ADDRESS.slice(0, -1)}A`} />);

    expect(a.querySelector('path')?.getAttribute('d'))
      .not.toBe(b.querySelector('path')?.getAttribute('d'));
  });

  it('is aria-hidden without a title and labelled with one', () => {
    const { rerender } = render(<QrCode value={ADDRESS} />);
    expect(screen.getByTestId('qr-code')).toHaveAttribute('aria-hidden', 'true');

    rerender(<QrCode value={ADDRESS} title="my address" />);
    expect(screen.getByRole('img', { name: 'my address' })).toBeInTheDocument();
  });

  it('renders nothing for an empty payload instead of throwing', () => {
    const { container } = render(<QrCode value="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
