/**
 * Minimal typings for the `qrcode` browser build.
 *
 * The package ships no declarations and `@types/qrcode` is not installed.
 * `src/components/QrCode.tsx` renders the modules itself, so it only needs
 * `create()`; `toString()` is here for the test that cross-checks our rendering
 * against the library's own SVG renderer. Keep this surface as small as what we
 * actually call.
 */
declare module 'qrcode' {
  export type QRCodeErrorCorrectionLevel = 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';

  export interface QRCodeOptions {
    version?: number;
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
    maskPattern?: number;
    toSJISFunc?: (codePoint: string) => number;
  }

  export interface QRCodeSymbol {
    modules: {
      size: number;
      data: Uint8Array;
    };
    version: number;
    errorCorrectionLevel: number;
    maskPattern: number;
    segments: unknown[];
  }

  export function create(text: string, options?: QRCodeOptions): QRCodeSymbol;

  export interface QRCodeToStringOptions extends QRCodeOptions {
    type?: 'svg' | 'utf8' | 'terminal';
    margin?: number;
  }

  export function toString(
    text: string,
    options: QRCodeToStringOptions,
    callback: (error: Error | null | undefined, result: string) => void,
  ): void;
}
