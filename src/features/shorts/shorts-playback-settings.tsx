import { useEffect, useRef, useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  ArrowLeft, Check, ChevronRight, Info, Settings,
} from 'lucide-react';
import { qualityModes, type QualityChoice, type ShortsQuality } from './shorts-quality';

const descriptions = {
  auto: 'Adjusts to your connection',
  high: 'Sharper picture, more data',
  'data-saver': 'Uses less data',
};

export const ShortsPlaybackSettings = ({
  active, quality, selection, choices = [], currentQuality, onQuality, onResolution, onDetails,
}: {
  active: boolean;
  quality: ShortsQuality;
  selection?: string;
  choices?: QualityChoice[];
  currentQuality?: string;
  onQuality: (quality: ShortsQuality) => void;
  onResolution: (key: string) => void;
  onDetails: () => void;
}) => {
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => { if (!active) setOpen(false); }, [active]);
  useEffect(() => { if (open) menu.current?.focus(); }, [advanced, open]);
  const selectedResolution = choices.find((choice) => choice.key === selection);
  const changeOpen = (value: boolean) => { setOpen(value); if (value) setAdvanced(false); };
  return (
    <Menu.Root open={open && active} onOpenChange={changeOpen} modal={false}>
      <Menu.Trigger asChild>
        <button type="button" className="sv-round" aria-label="Playback settings" title="Playback settings">
          <Settings size={21} aria-hidden="true" />
        </button>
      </Menu.Trigger>
      <Menu.Content
        ref={menu}
        className="sv-settings-menu"
        align="end"
        sideOffset={8}
        collisionPadding={14}
        aria-labelledby={undefined}
        aria-label={advanced ? 'Video resolution' : 'Playback settings'}
        onCloseAutoFocus={(event) => { if (!active) event.preventDefault(); }}
      >
        {advanced ? (
          <>
            <Menu.Item className="sv-settings-back" onSelect={(event) => { event.preventDefault(); setAdvanced(false); }}>
              <ArrowLeft size={17} aria-hidden="true" />
              Quality
            </Menu.Item>
            <Menu.Label className="sv-settings-heading">Resolution for this video</Menu.Label>
            <Menu.RadioGroup value={selection || ''} aria-label="Video resolution">
              {[...choices].sort((a, b) => b.size - a.size).map((choice) => (
                <Menu.RadioItem key={choice.key} value={choice.key} className="sv-settings-option" onSelect={() => onResolution(choice.key)}>
                  <span>{choice.label}</span>
                  <Menu.ItemIndicator><Check size={17} aria-hidden="true" /></Menu.ItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </>
        ) : (
          <>
            <Menu.Label className="sv-settings-heading">Playback quality</Menu.Label>
            <Menu.RadioGroup value={selection || quality} aria-label="Playback quality">
              {qualityModes.map((mode) => (
                <Menu.RadioItem key={mode.value} value={mode.value} className="sv-settings-option" onSelect={() => onQuality(mode.value)}>
                  <span>
                    <strong>{mode.label}</strong>
                    <small>{descriptions[mode.value]}</small>
                  </span>
                  <Menu.ItemIndicator><Check size={17} aria-hidden="true" /></Menu.ItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
            {!!choices.length && (
              <Menu.Item className="sv-settings-option" onSelect={(event) => { event.preventDefault(); setAdvanced(true); }}>
                <span>
                  <strong>Resolution</strong>
                  {selectedResolution && <small>{selectedResolution.label}</small>}
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </Menu.Item>
            )}
            {currentQuality && (
            <p className="sv-settings-current">
              Playing at
              {' '}
              {currentQuality}
            </p>
            )}
            <Menu.Separator className="sv-settings-divider" />
            <Menu.Item className="sv-settings-option" onSelect={onDetails}>
              <span>Video details and report</span>
              <Info size={17} aria-hidden="true" />
            </Menu.Item>
          </>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
