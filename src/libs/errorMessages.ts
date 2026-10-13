import i18n from '../i18n';

type ErrorContext = {
  action?: 'quote' | 'swap' | 'add-liquidity' | 'remove-liquidity' | 'wrap' | 'unwrap' | 'generic';
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  slippagePct?: number;
  deadlineMins?: number;
};

type Translate = (key: string, options?: any) => string;

/**
 * Error codes raised by the DEX contracts (dex-contracts-v2 build/errors.js),
 * mapped to translation keys in the `errors` namespace.
 */
const DEX_CONTRACT_ERRORS: Record<string, string> = {
  'AedexV2Library: IDENTICAL_ADDRESSES': 'identicalTokens',
  'AedexV2Library: INSUFFICIENT_AMOUNT': 'amountTooLow',
  'AedexV2Library: INSUFFICIENT_LIQUIDITY': 'insufficientLiquidity',
  'AedexV2Library: NO_PAIR_FOUND': 'noRoute',
  'AedexV2Library: INSUFFICIENT_INPUT_AMOUNT': 'amountTooLow',
  'AedexV2Library: INSUFFICIENT_OUTPUT_AMOUNT': 'outputTooLow',
  'AedexV2Library: INVALID_PATH': 'invalidRoute',
  'AedexV2Library: INTERNAL_ERROR_AMOUNTS_VOID': 'dexInternalError',
  'AedexV2Library: INTERNAL_ERROR_PATH_VOID': 'dexInternalError',
  'AedexV2Router: DIFFERENT_WAE_ADDRESSES': 'dexInternalError',
  'AedexV2Router: INSUFFICIENT_A_AMOUNT': 'poolRatioMoved',
  'AedexV2Router: INSUFFICIENT_B_AMOUNT': 'poolRatioMoved',
  'AedexV2Router: EXCESSIVE_INPUT_AMOUNT': 'excessiveInputAmount',
  'AedexV2Router: INVALID_PATH_LAST': 'invalidRoute',
  'AedexV2Router: INVALID_PATH_FIRST': 'invalidRoute',
  'AedexV2Router: INVALID_PATH': 'invalidRoute',
  'AedexV2Router: INSUFFICIENT_OUTPUT_AMOUNT': 'insufficientOutputAmount',
  'AedexV2Router: EXPIRED': 'deadlineReached',
  'AedexV2Router: AMOUNT_LIST_IS_SHORTER': 'dexInternalError',
  'WAE: LOW_BALANCE': 'insufficientBalance',
  'WAE: LOW_ALLOWANCE': 'tokenNotApproved',
  'WAE: ALLOWANCE_NOT_EXISTENT': 'tokenNotApproved',
  'WAE: NON_NEGATIVE_VALUE_REQUIRED': 'invalidAmount',
  'WAE: ALLOWANCE_ALREADY_EXISTENT': 'allowanceExists',
  'AedexV2Factory: FORBIDDEN': 'forbidden',
  'AedexV2Factory: IDENTICAL_ADDRESSES': 'identicalTokens',
  'AedexV2Factory: PAIR_EXISTS': 'pairExists',
  'AedexV2Pair: NEGATIVE_VALUE_ON_TRANSFER': 'invalidAmount',
  'AedexV2Pair: NOT_DEBUG_MODE': 'forbidden',
  'AedexV2Pair: LP': 'dexInternalError',
  'AedexV2Pair: INSUFFICIENT_LIQUIDITY_MINTED': 'liquidityMintedTooLow',
  'AedexV2Pair: INSUFFICIENT_OUTPUT_AMOUNT': 'outputTooLow',
  'AedexV2Pair: INSUFFICIENT_LIQUIDITY': 'insufficientLiquidity',
  'AedexV2Pair: INVALID_TO': 'invalidRecipient',
  'AedexV2Pair: INSUFFICIENT_INPUT_AMOUNT': 'amountTooLow',
  'AedexV2Pair: INSUFFICIENT_BALANCE': 'pairBalanceMissing',
  'AedexV2Pair: INSUFFICIENT_LIQUIDITY_BURNED': 'liquidityBurnedTooLow',
  'AedexV2Pair: INSUFFICIENT_BALANCE_FOR_TRANSFER': 'insufficientBalance',
  'AedexV2Pair: BALANCE_ACCOUNT_NOT_EXISTENT': 'noLiquidityPosition',
  'AedexV2Pair: INSUFFICIENT_ALLOWANCE': 'tokenNotApproved',
  'AedexV2Pair: ALLOWANCE_NOT_EXISTENT': 'tokenNotApproved',
  'AedexV2Pair: INSUFFICIENT_TOTAL_SUPPLY': 'dexInternalError',
  'AedexV2Pair: INSUFFICIENT_BALANCE_FOR_BURNING': 'liquidityBurnedTooLow',
};

const DEX_CONTRACT_ERROR_RE = (
  /\b(AedexV2(?:Library|Router|Factory|Pair)|WAE)\s*:\s*([A-Z][A-Z0-9_]*)/
);

function dexContractErrorMessage(raw: string, ctx: ErrorContext, t: Translate): string | null {
  const match = raw.match(DEX_CONTRACT_ERROR_RE);
  if (!match) return null;
  const key = DEX_CONTRACT_ERRORS[`${match[1]}: ${match[2]}`];
  if (!key) return null;
  if (key === 'insufficientOutputAmount' || key === 'poolRatioMoved' || key === 'excessiveInputAmount') {
    const hint = ctx.slippagePct != null ? t('slippageHint', { slippagePct: ctx.slippagePct }) : t('slippageHintGeneric');
    return t(key, { hint });
  }
  if (key === 'deadlineReached') {
    const hint = ctx.deadlineMins != null ? t('deadlineHint', { deadlineMins: ctx.deadlineMins }) : t('deadlineHintGeneric');
    return t(key, { hint });
  }
  return t(key);
}

/**
 * Convert low-level SDK/contract errors into concise, user-friendly messages.
 */
export function errorToUserMessage(err: unknown, ctx: ErrorContext = {}): string {
  const t: Translate = (key, options) => String(i18n.t(key, { ns: 'errors', ...options }));
  const raw = String((err as any)?.message || String(err || ''));
  const lc = raw.toLowerCase();

  // User cancelled in wallet
  if (lc.includes('rejected by user') || lc.includes('user rejected')) {
    return t('userRejected');
  }

  // Known DEX contract error codes
  const contractMessage = dexContractErrorMessage(raw, ctx, t);
  if (contractMessage) return contractMessage;

  // No route / pair
  if (lc.includes('no route') || lc.includes('pair not found') || lc.includes('no pair')) {
    return t('noRoute');
  }

  // Liquidity / reserves
  if (lc.includes('insufficient liquidity') || lc.includes('not enough liquidity') || lc.includes('no liquidity')) {
    return t('insufficientLiquidity');
  }

  // Amount too low/high
  if (lc.includes('insufficient_a_amount') || lc.includes('insufficient_b_amount') || lc.includes('insufficient input amount')) {
    return t('amountTooLow');
  }
  if (lc.includes('insufficient_output_amount')) {
    const hint = ctx.slippagePct != null ? t('slippageHint', { slippagePct: ctx.slippagePct }) : t('slippageHintGeneric');
    return t('insufficientOutputAmount', { hint });
  }

  // Deadline
  if (lc.includes('expired') || lc.includes('deadline')) {
    const hint = ctx.deadlineMins != null ? t('deadlineHint', { deadlineMins: ctx.deadlineMins }) : t('deadlineHintGeneric');
    return t('deadlineReached', { hint });
  }

  // Router specific reasons
  if (lc.includes('invalid_path') || lc.includes('invalid path')) {
    return t('invalidRoute');
  }
  if (lc.includes('invalid_to') || lc.includes('invalid to')) {
    return t('invalidRecipient');
  }
  if (lc.includes('pair_exists') || lc.includes('pair exists')) {
    return t('pairExists');
  }

  // Allowance / approval
  if (lc.includes('allowance') || lc.includes('transfer_from_failed') || lc.includes('approval') || lc.includes('approve')) {
    return t('tokenNotApproved');
  }

  // Balance / funds
  // Check for specific ETH balance errors first
  if (lc.includes('insufficient eth balance')) {
    const ethMatch = raw.match(/required:\s*([\d.]+)\s*eth/i);
    if (ethMatch && ethMatch[1]) {
      return t('insufficientEthBalance', { amount: ethMatch[1] });
    }
    return t('insufficientEthBalanceGeneric');
  }

  if (lc.includes('insufficient balance') || lc.includes('insufficient funds') || lc.includes('balance too low')) {
    return t('insufficientBalance');
  }

  // Network/connection issues
  if (lc.includes('network error') || lc.includes('connection failed') || lc.includes('timeout')) {
    return t('networkError');
  }

  // Contract/SDK issues
  if (lc.includes('contract not found') || lc.includes('invalid contract') || lc.includes('contract error')) {
    return t('contractError');
  }

  // Gas/fee issues
  if (lc.includes('out of gas') || lc.includes('gas limit') || lc.includes('insufficient fee')) {
    return t('gasError');
  }

  // Invalid amounts
  if (lc.includes('invalid amount') || lc.includes('amount cannot be zero') || lc.includes('negative amount')) {
    return t('invalidAmount');
  }

  // Generic invocation failure with reason
  const m = raw.match(/Invocation failed: ["']([^"']+)["']/i);
  if (m && m[1]) {
    // Clean router reason into a friendly line
    const reason = m[1]
      .replace(/aedexv2router:\s*/i, '')
      .replace(/_/g, ' ')
      .toLowerCase();
    switch (reason) {
      case 'insufficient a amount':
      case 'insufficient b amount':
      case 'insufficient input amount':
        return t('amountTooLow');
      case 'insufficient output amount':
        return t('insufficientOutputAmount', { hint: t('slippageHintGeneric') });
      case 'expired':
      case 'deadline':
        return t('deadlineReached', { hint: t('deadlineHintGeneric') });
      case 'invalid path':
        return t('invalidRoute');
      case 'invalid to':
        return t('invalidRecipient');
      case 'pair exists':
        return t('pairExists');
      case 'name not allowed char':
        return t('nameNotAllowedChar');
      default:
        break;
    }
  }

  // Fallbacks by action
  switch (ctx.action) {
    case 'quote':
      return t('quoteFailed');
    case 'swap':
    {
      // In development, include the raw error for debugging
      const debugInfo = process.env.NODE_ENV === 'development' && raw ? ` (Debug: ${raw.slice(0, 100)})` : '';
      return t('swapFailed', { debugInfo });
    }
    case 'add-liquidity':
      return t('addLiquidityFailed');
    case 'remove-liquidity':
      return t('removeLiquidityFailed');
    case 'wrap':
      return t('wrapFailed');
    case 'unwrap':
      return t('unwrapFailed');
    default:
      return t('genericError');
  }
}
