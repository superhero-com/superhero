import { Decimal, Decimalish } from "./decimal";
import { DifferenceRepresentation } from "./types";

export class Difference {
  private _number?: DifferenceRepresentation;

  private constructor(number?: DifferenceRepresentation) {
    this._number = number;
  }

  static between(
    d1: Decimalish | undefined,
    d2: Decimalish | undefined,
  ): Difference {
    if (d1 === undefined || d2 === undefined) {
      return new Difference(undefined);
    }

    d1 = Decimal.from(d1);
    d2 = Decimal.from(d2);

    if (d1.infinite && d2.infinite) {
      return new Difference(undefined);
    } else if (d1.infinite) {
      return new Difference({ sign: "+", absoluteValue: d1 });
    } else if (d2.infinite) {
      return new Difference({ sign: "-", absoluteValue: d2 });
    } else if (d1.gt(d2)) {
      return new Difference({
        sign: "+",
        absoluteValue: Decimal.from(d1).sub(d2),
      });
    } else if (d2.gt(d1)) {
      return new Difference({
        sign: "-",
        absoluteValue: Decimal.from(d2).sub(d1),
      });
    } else {
      return new Difference({ sign: "", absoluteValue: Decimal.ZERO });
    }
  }

  toString(precision?: number): string {
    if (!this._number) {
      return "N/A";
    }

    return this._number.sign + this._number.absoluteValue.toString(precision);
  }

  prettify(precision?: number): string {
    if (!this._number) {
      return this.toString();
    }

    return this._number.sign + this._number.absoluteValue.prettify(precision);
  }

  mul(multiplier: Decimalish): Difference {
    return new Difference(
      this._number && {
        sign: this._number.sign,
        absoluteValue: this._number.absoluteValue.mul(multiplier),
      },
    );
  }

  get nonZero(): this | undefined {
    return this._number?.absoluteValue.nonZero && this;
  }

  get positive(): this | undefined {
    return this._number?.sign === "+" ? this : undefined;
  }

  get negative(): this | undefined {
    return this._number?.sign === "-" ? this : undefined;
  }

  get absoluteValue(): Decimal | undefined {
    return this._number?.absoluteValue;
  }

  get infinite(): this | undefined {
    return this._number?.absoluteValue.infinite && this;
  }

  get finite(): this | undefined {
    return this._number?.absoluteValue.finite && this;
  }
}
