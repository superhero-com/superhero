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
  const raw = String((err as any)?.message || String(err || ''));
  const lc = raw.toLowerCase();

  // Enhanced logging for debugging
  console.log('===============================================')
  console.log('errorToUserMessage->err::', err)
  console.debug('[errorToUserMessage] Processing error:', {
    raw,
    lc,
    context: ctx,
    errorType: typeof err,
    errorName: (err as any)?.name,
    errorCode: (err as any)?.code
  });
  console.log('===============================================')

  // User cancelled in wallet
  if (lc.includes('rejected by user') || lc.includes('user rejected')) {
    return 'Transaction was rejected in your wallet.';
  }

  // No route / pair
  if (lc.includes('no route') || lc.includes('pair not found') || lc.includes('no pair')) {
    return 'No swap route found between the selected tokens. Try a smaller amount or a different pair.';
  }

  // Liquidity / reserves
  if (lc.includes('insufficient liquidity') || lc.includes('not enough liquidity') || lc.includes('no liquidity')) {
    return 'Not enough liquidity in the pool for this trade. Try a smaller amount or another route.';
  }

  // Amount too low/high
  if (lc.includes('insufficient_a_amount') || lc.includes('insufficient_b_amount') || lc.includes('insufficient input amount')) {
    return 'Amount too low for this pool. Increase the input amount.';
  }
  if (lc.includes('insufficient_output_amount')) {
    const hint = ctx.slippagePct != null ? ` Increase slippage (currently ${ctx.slippagePct}%) or reduce the trade size.` : ' Increase slippage or reduce the trade size.';
    return `Minimum output not met due to price movement.${hint}`;
  }

  // Deadline
  if (lc.includes('expired') || lc.includes('deadline')) {
    const hint = ctx.deadlineMins != null ? ` Increase the deadline (currently ${ctx.deadlineMins} min) and try again.` : ' Increase the deadline and try again.';
    return `The transaction deadline was reached.${hint}`;
  }

  // Router specific reasons
  if (lc.includes('invalid_path') || lc.includes('invalid path')) {
    return 'Invalid route. Please reselect tokens or try a different pair.';
  }
  if (lc.includes('invalid_to') || lc.includes('invalid to')) {
    return 'Invalid recipient for this transaction.';
  }
  if (lc.includes('pair_exists') || lc.includes('pair exists')) {
    return 'The pool already exists.';
  }

  // Allowance / approval
  if (lc.includes('allowance') || lc.includes('transfer_from_failed') || lc.includes('approval') || lc.includes('approve')) {
    return 'Token is not approved for spending. Please approve the token and try again.';
  }

  // Balance / funds
  // Check for specific ETH balance errors first
  if (lc.includes('insufficient eth balance')) {
    const ethMatch = raw.match(/required:\s*([\d.]+)\s*eth/i);
    if (ethMatch && ethMatch[1]) {
      return `Insufficient ETH balance. You need at least ${ethMatch[1]} ETH to complete this bridge operation.`;
    }
    return 'Insufficient ETH balance to complete this bridge operation.';
  }
  
  if (lc.includes('insufficient balance') || lc.includes('insufficient funds') || lc.includes('balance too low')) {
    return 'Not enough balance to complete this operation.';
  }

  // Network/connection issues
  if (lc.includes('network error') || lc.includes('connection failed') || lc.includes('timeout')) {
    return 'Network connection issue. Please check your connection and try again.';
  }

  // Contract/SDK issues
  if (lc.includes('contract not found') || lc.includes('invalid contract') || lc.includes('contract error')) {
    return 'Contract interaction failed. Please try again or contact support if the issue persists.';
  }

  // Gas/fee issues
  if (lc.includes('out of gas') || lc.includes('gas limit') || lc.includes('insufficient fee')) {
    return 'Transaction failed due to insufficient gas. Please try again with higher gas settings.';
  }

  // Invalid amounts
  if (lc.includes('invalid amount') || lc.includes('amount cannot be zero') || lc.includes('negative amount')) {
    return 'Invalid amount entered. Please enter a valid positive amount.';
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
        return 'Amount too low for this pool. Increase the input amount.';
      case 'insufficient output amount':
        return 'Minimum output not met due to price movement. Increase slippage or reduce the trade size.';
      case 'expired':
      case 'deadline':
        return 'The transaction deadline was reached. Increase the deadline and try again.';
      case 'invalid path':
        return 'Invalid route. Please reselect tokens or try a different pair.';
      case 'invalid to':
        return 'Invalid recipient for this transaction.';
      case 'pair exists':
        return 'The pool already exists.';
      default:
        break;
    }
  }

  // Fallbacks by action
  switch (ctx.action) {
    case 'quote':
      return 'Unable to get a price quote. Try again in a moment.';
    case 'swap':
      // In development, include the raw error for debugging
      const debugInfo = process.env.NODE_ENV === 'development' && raw ? ` (Debug: ${raw.slice(0, 100)})` : '';
      return `Swap failed. Please review your amounts and settings and try again.${debugInfo}`;
    case 'add-liquidity':
      return 'Adding liquidity failed. Check amounts and try again.';
    case 'remove-liquidity':
      return 'Removing liquidity failed. Check amounts and try again.';
    case 'wrap':
      return 'Wrapping failed. Try again.';
    case 'unwrap':
      return 'Unwrapping failed. Try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}


