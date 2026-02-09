import i18n from '../i18n';

export type ErrorContext = {
  action?: 'quote' | 'swap' | 'add-liquidity' | 'remove-liquidity' | 'wrap' | 'unwrap' | 'generic';
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  slippagePct?: number;
  deadlineMins?: number;
};

/**
 * Convert low-level SDK/contract errors into concise, user-friendly messages.
 */
export function errorToUserMessage(err: unknown, ctx: ErrorContext = {}): string {
  const t = (key: string, options?: any) => String(i18n.t(key, { ns: 'errors', ...options }));
  const raw = String((err as any)?.message || String(err || ''));
  const lc = raw.toLowerCase();

  // User cancelled in wallet
  if (lc.includes('rejected by user') || lc.includes('user rejected')) {
    return t('userRejected');
  }

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
