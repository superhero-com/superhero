import { useMemo } from 'react';
import { create } from 'qrcode';

/**
 * QR renderer for wallet addresses.
 *
 * `qrcode` only produces the module matrix here — the drawing is ours, as one
 * SVG `<path>` of unit squares. That keeps the output resolution-independent
 * (no canvas raster to go soft on a hi-DPI phone), themable through `fg`/`bg`,
 * and free of `dangerouslySetInnerHTML`, which the library's own SVG renderer
 * would require.
 *
 * Modules stay square on purpose: rounded "designer" modules cost scan margin
 * on cheap camera stacks, and a receive address is the one thing that must
 * scan on the first try.
 */

/** Blank modules kept around the symbol. The spec's minimum is 4. */
const QUIET_ZONE = 2;

export interface QrCodeProps {
  /** Payload to encode — for us, a bare `ak_…` address. */
  value: string;
  /** Rendered edge length in px. The SVG scales to it; the matrix is unitless. */
  size?: number;
  /** Module colour. */
  fg?: string;
  /** Background colour, including the quiet zone. */
  bg?: string;
  className?: string;
  /** Accessible name. Falls back to `aria-hidden` when omitted. */
  title?: string;
}

const QrCode = ({
  value,
  size = 200,
  fg = '#0a0a0f',
  bg = '#ffffff',
  className = '',
  title,
}: QrCodeProps) => {
  const symbol = useMemo(() => {
    if (!value) return null;
    try {
      // 'M' (~15% recovery) is the sweet spot for a ~53-char address: it survives
      // a scuffed phone screen without pushing the version — and the module
      // count — high enough to hurt on a small viewport.
      return create(value, { errorCorrectionLevel: 'M' });
    } catch {
      // An over-long or unencodable payload should degrade to "no QR", never
      // take the modal down with it.
      return null;
    }
  }, [value]);

  const path = useMemo(() => {
    if (!symbol) return '';
    const { size: count, data } = symbol.modules;
    const parts: string[] = [];
    for (let y = 0; y < count; y += 1) {
      for (let x = 0; x < count; x += 1) {
        if (data[y * count + x]) {
          parts.push(`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`);
        }
      }
    }
    return parts.join('');
  }, [symbol]);

  if (!symbol) return null;

  const extent = symbol.modules.size + QUIET_ZONE * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${extent} ${extent}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-testid="qr-code"
    >
      <rect width={extent} height={extent} fill={bg} />
      <path d={path} fill={fg} />
    </svg>
  );
};

export default QrCode;
