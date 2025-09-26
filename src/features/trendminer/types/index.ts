import { Decimal } from '../../../libs/decimal';

export interface TokenTradeState {
  tokenA?: number;
  tokenB?: number;
  tokenAFocused: boolean;
  isBuying: boolean;
  isAllowSelling: boolean;
  loadingTransaction: boolean;
  nextPrice: Decimal;
  userBalance: string;
  slippage: number;
  errorMessage?: string;
  successTxData?: {
    isBuying: boolean;
    destAmount: Decimal;
    sourceAmount: Decimal;
    symbol: string;
    protocolReward?: Decimal;
    protocolSymbol?: string;
    userBalance: Decimal;
  };
}

export interface TokenDto {
  sale_address?: string;
  symbol?: string;
  decimals?: number;
  total_supply?: string;
  price?: number;
  sell_price?: number;
  name?: string;
  address?: string;
}

export interface TradeCalculation {
  amount: number;
  priceImpact: Decimal;
  averagePrice: Decimal;
}
