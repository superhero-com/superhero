import type { PriceDto } from '@/api/generated/models/PriceDto';

type NormalizedTransactionFields = {
  address: string;
  price_data: PriceDto;
  spent_amount_data: PriceDto;
};

const EMPTY_PRICE_DATA: PriceDto = Object.freeze({
  ae: 0,
  usd: 0,
  eur: 0,
  aud: 0,
  brl: 0,
  cad: 0,
  chf: 0,
  gbp: 0,
  xau: 0,
});

export function normalizeTransaction<T extends Record<string, any>>(
  transaction: T,
): T & NormalizedTransactionFields {
  return {
    ...transaction,
    address: transaction?.address || transaction?.account || '',
    price_data: transaction?.price_data
      ?? transaction?.unit_price
      ?? transaction?.buy_price
      ?? EMPTY_PRICE_DATA,
    spent_amount_data: transaction?.spent_amount_data
      ?? transaction?.amount
      ?? EMPTY_PRICE_DATA,
  } as T & NormalizedTransactionFields;
}
