import type { Decimal } from "./decimal";

export type DifferenceRepresentation = {
  sign: "" | "+" | "-";
  absoluteValue: Decimal;
};
