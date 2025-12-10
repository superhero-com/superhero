import FractionFormatter, { FormattedFractionalPrice } from "@/features/shared/components/FractionFormatter";
import { Decimal } from '../../../libs/decimal';
import { formatFractionalPrice } from '@/utils/common';

interface FiatPriceFormatterProps {
  fiatPrice: Decimal;
  currencySymbol?: string;
  className?: string;
}

const DEFAULT_CURRENCY_SYMBOL = '$';

export default function FiatPriceFormatter({
  fiatPrice,
  currencySymbol = DEFAULT_CURRENCY_SYMBOL,
  className = '',
}: FiatPriceFormatterProps) {
  // Use formatFractionalPrice to show fractional notation for very small amounts (as QA prefers)
  const formattedPriceRaw = formatFractionalPrice(fiatPrice);
  
  // Convert to FractionFormatter's expected type (zerosCount as string)
  const formattedPrice: FormattedFractionalPrice = {
    number: formattedPriceRaw.number,
    zerosCount: formattedPriceRaw.zerosCount !== undefined ? String(formattedPriceRaw.zerosCount) : undefined,
    significantDigits: formattedPriceRaw.significantDigits,
  };
  
  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className={className}>{currencySymbol}</div>
      <FractionFormatter fractionalPrice={formattedPrice} />
    </div>
  );
}
