/* eslint-disable */
import assert from 'assert';

import { BigNumber } from '@ethersproject/bignumber';

const MAX_UINT_256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const PRECISION = 18;
const ONE = BigNumber.from(1);
const TEN = BigNumber.from(10);

const getDigits = (numDigits: number) => TEN.pow(numDigits);
const DIGITS = getDigits(PRECISION);

const stringRepresentationFormat = /^[0-9]*(\.[0-9]*)?(e[-+]?[0-9]+)?$/;
const trailingZeros = /0*$/;
const magnitudes = ['', 'K', 'M', 'B', 'T'];

// Move roundedMul after Decimal class definition to avoid circular reference
// const roundedMul = (x: BigNumber, y: BigNumber) =>
//   x.mul(y).add(Decimal.HALF.hex).div(DIGITS);

/**
 * Types that can be converted into a Decimal.
 *
 * @public
 */
// eslint-disable-next-line no-use-before-define
export type Decimalish = Decimal | number | string;

/**
 * Fixed-point decimal bignumber with 18 digits of precision.
 */
export class Decimal {
  static readonly INFINITY = Decimal.fromBigNumberString(MAX_UINT_256);

  static readonly ZERO = Decimal.from(0);

  static readonly HALF = Decimal.from(0.5);

  static readonly ONE = Decimal.from(1);

  private readonly _bigNumber: BigNumber;

  /** @internal */
  get hex(): string {
    return this._bigNumber.toHexString();
  }

  /** @internal */
  get bigNumber(): string {
    return this._bigNumber.toString();
  }

  private constructor(bigNumber: BigNumber) {
    // if (bigNumber.isNegative()) {
    //   throw new Error("negatives not supported by Decimal");
    // }

    this._bigNumber = bigNumber;
  }

  static fromBigNumberString(bigNumberString: string): Decimal {
    return new Decimal(BigNumber.from(bigNumberString));
  }

  private static _fromString(representation: string): Decimal {
    if (!representation || !representation.match(stringRepresentationFormat)) {
      return Decimal.ZERO;
    }

    if (representation.includes('e')) {
      // eslint-disable-next-line prefer-const
      let [coefficient, exponent] = representation.split('e');

      if (exponent.startsWith('-')) {
        return new Decimal(
          Decimal._fromString(coefficient)._bigNumber.div(
            TEN.pow(BigNumber.from(exponent.substr(1))),
          ),
        );
      }

      if (exponent.startsWith('+')) {
        exponent = exponent.substr(1);
      }

      return new Decimal(
        Decimal._fromString(coefficient)._bigNumber.mul(
          TEN.pow(BigNumber.from(exponent)),
        ),
      );
    }

    if (!representation.includes('.')) {
      return new Decimal(BigNumber.from(representation).mul(DIGITS));
    }

    // eslint-disable-next-line prefer-const
    let [characteristic, mantissa] = representation.split('.');

    if (mantissa.length < PRECISION) {
      mantissa += '0'.repeat(PRECISION - mantissa.length);
    } else {
      mantissa = mantissa.substr(0, PRECISION);
    }

    return new Decimal(
      BigNumber.from(characteristic || 0)
        .mul(DIGITS)
        .add(mantissa),
    );
  }

  static from(decimalish: Decimalish): Decimal {
    switch (typeof decimalish) {
      case 'object':
        if (decimalish instanceof Decimal) {
          return decimalish;
        }
        console.error('invalid Decimalish value', decimalish);
        // throw new Error("invalid Decimalish value");
        return Decimal.ZERO;

      case 'string':
        return Decimal._fromString(decimalish);
      case 'number':
        return Decimal._fromString(decimalish.toString());
      default:
        console.error('invalid Decimalish value::', decimalish);
        // throw new Error("invalid Decimalish value");
        return Decimal.ZERO;
    }
  }

  private _toStringWithAutomaticPrecision() {
    const characteristic = this._bigNumber.div(DIGITS);
    const mantissa = this._bigNumber.mod(DIGITS);

    if (mantissa.isZero()) {
      return characteristic.toString();
    }
    const paddedMantissa = mantissa.toString().padStart(PRECISION, '0');
    const trimmedMantissa = paddedMantissa.replace(trailingZeros, '');
    const firstNonZeroIndex = trimmedMantissa.search(/[^0]/);

    return (
      `${characteristic.toString()
      }.${
        trimmedMantissa.substr(0, firstNonZeroIndex + 3)}`
    );
  }

  private _toStringWithoutPrecision() {
    const characteristic = this._bigNumber.div(DIGITS);
    const mantissa = this._bigNumber.mod(DIGITS);

    if (mantissa.isZero()) {
      return characteristic.toString();
    }
    const paddedMantissa = mantissa.toString().padStart(PRECISION, '0');
    const trimmedMantissa = paddedMantissa.replace(trailingZeros, '');

    return `${characteristic.toString()}.${trimmedMantissa}`;
  }

  private _roundUp(precision: number) {
    const halfDigit = getDigits(PRECISION - 1 - precision).mul(5);
    return this._bigNumber.add(halfDigit);
  }

  private _toStringWithPrecision(precision: number) {
    if (precision < 0) {
      throw new Error('precision must not be negative');
    }

    const value = precision < PRECISION ? this._roundUp(precision) : this._bigNumber;
    const characteristic = value.div(DIGITS);
    const mantissa = value.mod(DIGITS);

    if (precision === 0) {
      return characteristic.toString();
    }
    const paddedMantissa = mantissa.toString().padStart(PRECISION, '0');
    const trimmedMantissa = paddedMantissa.substr(0, precision);
    return `${characteristic.toString()}.${trimmedMantissa}`;
  }

  toString(precision?: number): string {
    if (this.infinite) {
      return '∞';
    } if (precision !== undefined) {
      return this._toStringWithPrecision(precision);
    }
    return this._toStringWithAutomaticPrecision();
  }

  toStringWithoutPrecision(): string {
    return this._toStringWithoutPrecision();
  }

  prettify(precision?: number): string {
    const [characteristic, mantissa] = this.toString(precision).split('.');
    const prettyCharacteristic = characteristic.replace(
      /(\d)(?=(\d{3})+(?!\d))/g,
      '$1,',
    );

    return mantissa !== undefined
      ? `${prettyCharacteristic}.${mantissa}`
      : prettyCharacteristic;
  }

  smartPrettify(): string {
    const [, mantissa] = this.toString().split('.');
    // check mantissa number if all 0 decimal point is not needed
    const decimalCount = mantissa?.replace(/0/g, '').length;

    return this.prettify(this.lt(Decimal.ONE) ? 8 : decimalCount);
  }

  moneyPrettify(): string {
    const [, mantissa] = this.toString().split('.');
    const decimalCount = mantissa?.replace(/0/g, '').length;
    if (this.isZero) {
      return '0';
    }
    return this.prettify(this.lt(Decimal.ONE) ? decimalCount + 2 : 2);
  }

  prettifyWithMaxPrecision(): string {
    const [characteristic, mantissa] = this.toString().split('.');
    const prettyCharacteristic = characteristic.replace(
      /(\d)(?=(\d{3})+(?!\d))/g,
      '$1,',
    );

    return mantissa !== undefined
      ? `${prettyCharacteristic}.${mantissa}`
      : prettyCharacteristic;
  }

  shorten(): string {
    const characteristicLength = this.toString(0).length;
    const magnitude = Math.min(
      Math.floor((characteristicLength - 1) / 3),
      magnitudes.length - 1,
    );

    const precision = Math.max(3 * (magnitude + 1) - characteristicLength, 0);
    const normalized = this.div(
      new Decimal(getDigits(PRECISION + 3 * magnitude)),
    );

    return normalized.prettify(precision) + magnitudes[magnitude];
  }

  add(addend: Decimalish): Decimal {
    return new Decimal(this._bigNumber.add(Decimal.from(addend)._bigNumber));
  }

  sub(subtrahend: Decimalish): Decimal {
    return new Decimal(
      this._bigNumber.sub(Decimal.from(subtrahend)._bigNumber),
    );
  }

  mul(multiplier: Decimalish): Decimal {
    return new Decimal(
      this._bigNumber.mul(Decimal.from(multiplier)._bigNumber).div(DIGITS),
    );
  }

  div(divider: Decimalish): Decimal {
    divider = Decimal.from(divider);

    if (divider.isZero) {
      return Decimal.INFINITY;
    }

    return new Decimal(this._bigNumber.mul(DIGITS).div(divider._bigNumber));
  }

  /** @internal */
  _divCeil(divider: Decimalish): Decimal {
    divider = Decimal.from(divider);

    if (divider.isZero) {
      return Decimal.INFINITY;
    }

    return new Decimal(
      this._bigNumber
        .mul(DIGITS)
        .add(divider._bigNumber.sub(ONE))
        .div(divider._bigNumber),
    );
  }

  mulDiv(multiplier: Decimalish, divider: Decimalish): Decimal {
    multiplier = Decimal.from(multiplier);
    divider = Decimal.from(divider);

    if (divider.isZero) {
      return Decimal.INFINITY;
    }

    return new Decimal(
      this._bigNumber.mul(multiplier._bigNumber).div(divider._bigNumber),
    );
  }

  pow(exponent: number): Decimal {
    assert(Number.isInteger(exponent));
    assert(exponent >= 0 && exponent <= 0xffffffff); // Ensure we're safe to use bitwise ops

    if (exponent === 0) {
      return Decimal.ONE;
    }

    if (exponent === 1) {
      return this;
    }

    let x = this._bigNumber;
    let y = DIGITS;

    for (; exponent > 1; exponent >>>= 1) {
      if (exponent & 1) {
        y = roundedMul(x, y);
      }

      x = roundedMul(x, x);
    }

    return new Decimal(roundedMul(x, y));
  }

  get isZero(): boolean {
    return this._bigNumber.isZero();
  }

  get zero(): this | undefined {
    if (this.isZero) {
      return this;
    }
  }

  get nonZero(): this | undefined {
    if (!this.isZero) {
      return this;
    }
  }

  get infinite(): this | undefined {
    if (this.eq(Decimal.INFINITY)) {
      return this;
    }
  }

  get finite(): this | undefined {
    if (!this.eq(Decimal.INFINITY)) {
      return this;
    }
  }

  /** @internal */
  get absoluteValue(): this {
    return this;
  }

  lt(that: Decimalish): boolean {
    return this._bigNumber.lt(Decimal.from(that)._bigNumber);
  }

  eq(that: Decimalish): boolean {
    return this._bigNumber.eq(Decimal.from(that)._bigNumber);
  }

  gt(that: Decimalish): boolean {
    return this._bigNumber.gt(Decimal.from(that)._bigNumber);
  }

  gte(that: Decimalish): boolean {
    return this._bigNumber.gte(Decimal.from(that)._bigNumber);
  }

  lte(that: Decimalish): boolean {
    return this._bigNumber.lte(Decimal.from(that)._bigNumber);
  }

  static min(a: Decimalish, b: Decimalish): Decimal {
    a = Decimal.from(a);
    b = Decimal.from(b);

    return a.lt(b) ? a : b;
  }

  static max(a: Decimalish, b: Decimalish): Decimal {
    a = Decimal.from(a);
    b = Decimal.from(b);

    return a.gt(b) ? a : b;
  }
}

// Define roundedMul after Decimal class to avoid circular reference
const roundedMul = (x: BigNumber, y: BigNumber) => x.mul(y).add(Decimal.HALF.hex).div(DIGITS);
