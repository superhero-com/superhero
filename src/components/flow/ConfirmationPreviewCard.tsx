import type { ConfirmationPreview } from '@/features/flow-watcher';

interface ConfirmationPreviewCardProps {
  preview: ConfirmationPreview;
  currentStep?: number;
  totalSteps?: number;
  nextStepLabel?: string;
  waitingForWallet?: boolean;
}

export const ConfirmationPreviewCard = ({
  preview,
  currentStep,
  totalSteps,
  nextStepLabel,
  waitingForWallet = false,
}: ConfirmationPreviewCardProps) => (
  <div className="bg-white/[0.05] border border-white/10 rounded-xl p-4 mb-4">
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm font-semibold text-white">
        {preview.title}
      </div>
      {currentStep && totalSteps && (
        <div className="text-xs text-white/60">
          Step
          {' '}
          {currentStep}
          /
          {totalSteps}
        </div>
      )}
    </div>

    <div className="grid gap-1 text-xs text-white/70">
      <div className="flex justify-between gap-3">
        <span className="text-white/50">Action</span>
        <span className="text-right text-white">{preview.action}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-white/50">Network</span>
        <span className="text-right text-white">{preview.network}</span>
      </div>
      {preview.asset && (
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Asset</span>
          <span className="text-right text-white">{preview.asset}</span>
        </div>
      )}
      {preview.amount && (
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Amount</span>
          <span className="text-right text-white">{preview.amount}</span>
        </div>
      )}
      {preview.spenderOrContract && (
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Contract</span>
          <span className="text-right break-all text-white">{preview.spenderOrContract}</span>
        </div>
      )}
    </div>

    {preview.riskHint && (
      <div className="mt-3 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1.5">
        {preview.riskHint}
      </div>
    )}

    <div className="mt-3 text-xs text-white/60">
      {waitingForWallet ? 'Waiting for wallet confirmation...' : 'Review before opening wallet.'}
    </div>
    {nextStepLabel && (
      <div className="mt-1 text-xs text-white/40">
        Next:
        {' '}
        {nextStepLabel}
      </div>
    )}
  </div>
);
