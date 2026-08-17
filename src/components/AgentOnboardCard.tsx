/**
 * AgentOnboardCard
 *
 * Expandable card in the connect modal that gives developers the
 * one-liner to install the Superhero OpenClaw skill and start the setup guide.
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const CLONE_CMD = 'git clone https://github.com/superhero-com/superhero-agent-skill.git superhero';
const PROMPT_TEXT = 'Based on the /superhero skill, start the setup guide.';

const AgentIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="20" height="20" rx="5" stroke="#10b981" strokeWidth="2" />
    <circle cx="14" cy="12" r="3" fill="#10b981" />
    <path d="M9 20c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="20" cy="8" r="2" fill="#10b981" />
  </svg>
);

const CopyIcon = ({ copied }: { copied: boolean }) => (
  copied ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7l4 4 6-7" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 4V2.5A1.5 1.5 0 015.5 1H11.5A1.5 1.5 0 0113 2.5V8.5A1.5 1.5 0 0111.5 10H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
);

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return { copied, copy };
}

const AgentOnboardCard = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const cloneCopy = useCopy(CLONE_CMD);
  const promptCopy = useCopy(PROMPT_TEXT);

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden transition-all duration-200"
      style={{ background: expanded ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.03)' }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="relative flex items-center gap-4 w-full p-4 text-left border-0 transition-all duration-200 cursor-pointer hover:bg-white/[0.03]"
        style={{ outline: 'none', background: 'transparent' }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
          style={{ background: 'rgba(16,185,129,0.12)' }}
        >
          <AgentIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {t('common.modals.onboarding.agentTitle', { defaultValue: 'Onboard your AI Agent' })}
            </span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}
            >
              {t('common.modals.onboarding.agentBadge', { defaultValue: 'Skill' })}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            {t('common.modals.onboarding.agentDesc', { defaultValue: 'Let your AI agent interact with Superhero on your behalf' })}
          </p>
        </div>
        <div
          className="shrink-0 text-white/30 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Expanded setup guide */}
      {expanded && (
        <div className="px-4 pb-5 border-t border-white/[0.06]">
          <p className="text-xs text-white/50 mt-4 mb-4 leading-relaxed">
            {t('common.modals.onboarding.agentGuideIntro', { defaultValue: 'Install the Superhero skill in your AI agent workspace, then run the setup guide.' })}
          </p>

          {/* Step 1 — clone */}
          <div className="mb-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">
              {t('common.modals.onboarding.agentStep1', { defaultValue: '1 · Clone the skill' })}
            </p>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <code className="flex-1 text-[11px] text-emerald-300 font-mono break-all leading-relaxed">
                {CLONE_CMD}
              </code>
              <button
                type="button"
                onClick={cloneCopy.copy}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border-0 cursor-pointer transition-all duration-150"
                style={{
                  background: cloneCopy.copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                  color: cloneCopy.copied ? '#10b981' : 'rgba(255,255,255,0.5)',
                }}
                aria-label="Copy git clone command"
              >
                <CopyIcon copied={cloneCopy.copied} />
                <span className="text-[10px] font-medium ml-0.5">
                  {cloneCopy.copied
                    ? t('common.modals.onboarding.copied', { defaultValue: 'Copied!' })
                    : t('common.modals.onboarding.copy', { defaultValue: 'Copy' })}
                </span>
              </button>
            </div>
          </div>

          {/* Step 2 — prompt */}
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">
              {t('common.modals.onboarding.agentStep2', { defaultValue: '2 · Copy this prompt to your agent' })}
            </p>
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="flex-1 text-[11px] text-white/70 leading-relaxed italic">
                {`"${PROMPT_TEXT}"`}
              </p>
              <button
                type="button"
                onClick={promptCopy.copy}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border-0 cursor-pointer transition-all duration-150 mt-0.5"
                style={{
                  background: promptCopy.copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                  color: promptCopy.copied ? '#10b981' : 'rgba(255,255,255,0.5)',
                }}
                aria-label="Copy agent prompt"
              >
                <CopyIcon copied={promptCopy.copied} />
                <span className="text-[10px] font-medium ml-0.5">
                  {promptCopy.copied
                    ? t('common.modals.onboarding.copied', { defaultValue: 'Copied!' })
                    : t('common.modals.onboarding.copy', { defaultValue: 'Copy' })}
                </span>
              </button>
            </div>
          </div>

          <p className="text-[10px] text-white/30 mt-3 leading-relaxed">
            {t('common.modals.onboarding.agentNote', { defaultValue: 'Works with Claude, Codex, or any OpenClaw-compatible agent.' })}
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentOnboardCard;
