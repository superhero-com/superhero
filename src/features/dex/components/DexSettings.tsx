import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useDex } from '../../../hooks';

interface DexSettingsProps {
  children: React.ReactNode;
  title?: string;
}

const DexSettings = ({ children, title = 'DEX Settings' }: DexSettingsProps) => {
  const {
    slippagePct, deadlineMins, setSlippage, setDeadline,
  } = useDex();
  const [open, setOpen] = useState(false);
  const [tempSlippage, setTempSlippage] = useState(slippagePct.toString());
  const [tempDeadline, setTempDeadline] = useState(deadlineMins.toString());

  const handleSave = () => {
    const newSlippage = parseFloat(tempSlippage);
    const newDeadline = parseInt(tempDeadline, 10);

    if (!Number.isNaN(newSlippage) && newSlippage > 0 && newSlippage <= 50) {
      setSlippage(newSlippage);
    }

    if (!Number.isNaN(newDeadline) && newDeadline > 0 && newDeadline <= 180) {
      setDeadline(newDeadline);
    }

    setOpen(false);
  };

  const handleCancel = () => {
    setTempSlippage(slippagePct.toString());
    setTempDeadline(deadlineMins.toString());
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[1000]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(20,20,28,0.98)] text-standard-font-color border border-glass-border rounded-2xl p-6 w-[400px] max-w-[90vw] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[1001] outline-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="font-bold text-lg m-0 text-standard-font-color">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-glass-border text-standard-font-color cursor-pointer text-sm"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Slippage Setting */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-standard-font-color mb-2">
              Slippage Tolerance
            </label>
            <div className="flex gap-2 mb-2">
              {[0.1, 0.5, 1.0].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setTempSlippage(preset.toString())}
                  className={`px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all duration-200 ${
                    tempSlippage === preset.toString()
                      ? 'border-accent-color bg-red-500/20 text-standard-font-color'
                      : 'border-white/10 bg-white/5 text-standard-font-color'
                  }`}
                >
                  {preset}
                  %
                </button>
              ))}
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={tempSlippage}
                  onChange={(e) => setTempSlippage(e.target.value)}
                  placeholder="Custom"
                  min="0.1"
                  max="50"
                  step="0.1"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-standard-font-color text-xs outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-font-color pointer-events-none">
                  %
                </span>
              </div>
            </div>
            <div className="text-[11px] text-light-font-color opacity-80">
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </div>
          </div>

          {/* Transaction Deadline */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-standard-font-color mb-2">
              Transaction Deadline
            </label>
            <div className="flex gap-2 mb-2">
              {[10, 20, 30].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setTempDeadline(preset.toString())}
                  className={`px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all duration-200 ${
                    tempDeadline === preset.toString()
                      ? 'border-accent-color bg-red-500/20 text-standard-font-color'
                      : 'border-white/10 bg-white/5 text-standard-font-color'
                  }`}
                >
                  {preset}
                  m
                </button>
              ))}
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={tempDeadline}
                  onChange={(e) => setTempDeadline(e.target.value)}
                  placeholder="Custom"
                  min="1"
                  max="180"
                  step="1"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-standard-font-color text-xs outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-font-color pointer-events-none">
                  min
                </span>
              </div>
            </div>
            <div className="text-[11px] text-light-font-color opacity-80">
              Your transaction will be cancelled if it's pending for more than this long.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-standard-font-color text-sm font-semibold cursor-pointer transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-5 py-3 rounded-xl border-none bg-button-gradient text-white text-sm font-bold cursor-pointer transition-all duration-300"
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default DexSettings;
