import { useLayoutEffect, useRef } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MessageComposer = ({
  value, onChange, onSend, disabled, isSending, placeholder = 'Write a message…',
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => Promise<void>;
  disabled: boolean;
  isSending: boolean;
  placeholder?: string;
}) => {
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (!input.current) return;
    input.current.style.height = 'auto';
    input.current.style.height = `${Math.min(input.current.scrollHeight, 144)}px`;
  }, [value]);
  return (
    <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); if (!disabled) onSend(); }}>
      <textarea
        ref={input}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!disabled) onSend();
          }
        }}
        placeholder={placeholder}
        aria-label="Message"
      />
      <Button type="submit" size="icon" aria-label="Send message" disabled={disabled}>
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
};
