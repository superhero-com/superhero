import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QualiChatService, type QualiMessage } from '../../libs/QualiChatService';
import AeButton from '../AeButton';

type Props = {
  token: {
    name: string;
    address: string;
  };
  mode?: 'full' | 'ctaOnly' | 'messagesOnly';
};

type ChatState = {
  messages: QualiMessage[];
  from: string | undefined;
  endReached: boolean;
  loading: boolean;
  error: string | null;
  retryCount: number;
};

// Loading skeleton component
const MessageSkeleton = () => (
  <div className="h-10.5 rounded-lg bg-white/8 animate-pulse" />
);

// Individual message component
const MessageItem = ({ message, index }: { message: QualiMessage; index: number }) => {
  const formatTimestamp = (ts?: number) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return '';
    }
  };

  function parseAddress(address: string) {
    if (address.startsWith('@')) {
      address = address.slice(1);
    }
    if (address.includes(':')) {
      address = address.split(':')[0];
    }
    return address;
  }

  return (
    <div className="border border-white/20 rounded-lg p-2.5 bg-white/5">
      <div className="text-xs opacity-80 flex justify-between mb-0.5 text-white/80">
        <AddressAvatarWithChainName
          address={parseAddress(message.sender)}
          size={36}
          contentClassName="px-2 pb-0"
          className="w-auto"
        />
        <span>{formatTimestamp(message.timestamp)}</span>
      </div>
      <div className="text-sm text-white">
        {message.content?.body}
      </div>
    </div>
  );
};

// Error display component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-red-400 text-sm text-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
    <div className="mb-2">{error}</div>
    <AeButton
      onClick={onRetry}
      variant="ghost"
      size="small"
      className="text-red-400 hover:text-red-300"
    >
      Retry
    </AeButton>
  </div>
);

// Empty state component
const EmptyState = () => (
  <div className="text-center py-8">
    <div className="text-sm text-white/60 mb-2">No public chat messages yet</div>
    <div className="text-xs text-white/40">Be the first to share your thoughts!</div>
  </div>
);

// Add chat CTAs component (reimagined layout)
const AddCommentCTA = ({ token }: { token: { name: string; address: string } }) => {
  const roomName = (token.name || '').replace(/-/g, '');
  const encodedName = encodeURIComponent(roomName);
  const encodedAddress = encodeURIComponent(token.address);
  const qualiPublicUrl = `https://app.quali.chat/#/room/#PUB_${encodedName}_${encodedAddress}_AETERNITY:quali.chat`;
  const qualiPrivateUrl = `https://app.quali.chat/#/room/#PRIV_${encodedName}_${encodedAddress}_AETERNITY:quali.chat`;

  return (
    <div className="relative overflow-hidden border border-white/10 rounded-2xl p-4 md:p-5 bg-white/[0.03] backdrop-blur-[14px] z-0">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-[radial-gradient(circle_at_center,rgba(78,205,196,0.25),transparent_60%)]" />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4 text-left">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/12 border border-white/15 flex items-center justify-center">
          <span className="text-white text-base">💬</span>
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold text-[16px] mb-0.5 tracking-wide">
            Chat for #{token.name || 'this token'} holders
          </h4>
          <p className="text-white/70 text-xs leading-relaxed">
            Buy this token to join the exclusive chat rooms. Your wallet proves ownership; access is token‑gated.
          </p>
        </div>
      </div>

      {/* Rooms grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a
          href={qualiPublicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group no-underline rounded-xl border border-white/15 bg-white/[0.05] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-white/30 no-gradient-text"
          title="Open the public chat on Quali.chat"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center">
              <span className="no-gradient-text">🌐</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold leading-tight">
                <span className="bg-gradient-to-r from-[#b06cf5] via-[#ff7eb3] to-[#ff9f4d] bg-clip-text text-transparent">Public chat</span>
              </div>
              <div className="text-[11px] text-white/65 leading-tight">Read for all • Write only for holders</div>
            </div>
            <div className="text-white/60 group-hover:text-white transition-colors">↗</div>
          </div>
        </a>

        <a
          href={qualiPrivateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group no-underline rounded-xl border border-white/15 bg-white/[0.05] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-white/30 no-gradient-text"
          title="Open the private chat on Quali.chat (holders only)"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center">
              <span className="no-gradient-text">🔒</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold leading-tight">
                <span className="bg-gradient-to-r from-[#b06cf5] via-[#ff7eb3] to-[#ff9f4d] bg-clip-text text-transparent">Private chat</span>
              </div>
              <div className="text-[11px] text-white/65 leading-tight">Read and write only for holders</div>
            </div>
            <div className="text-white/60 group-hover:text-white transition-colors">↗</div>
          </div>
        </a>
      </div>
      <div className="mt-3 text-xs opacity-70 text-white/70 text-center">
        Service provided by{' '}
        <a
          href="https://quali.chat"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4ecdc4] hover:text-white transition-colors underline"
        >
          <strong>Quali.chat</strong>
        </a>
      </div>
    </div>
  );
};

export default function TokenChat({ token, mode = 'full' }: Props) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    from: undefined,
    endReached: false,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fromRef = useRef<string | undefined>(undefined);
  const maxRetries = 3;
  const tokenRef = useRef<{ name: string; address: string }>(token);
  const loadMessagesRef = useRef<(isInitial?: boolean) => void>();
  const scheduleRetryRef = useRef<(isInitial: boolean) => void>();

  // Keep token ref in sync to avoid recreating callbacks
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Determine what parts to render/fetch based on mode
  const showCTA = mode !== 'messagesOnly';
  const showMessages = mode !== 'ctaOnly';

  const resetChat = useCallback(() => {
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    fromRef.current = undefined;
    setState({
      messages: [],
      from: undefined,
      endReached: false,
      loading: false,
      error: null,
      retryCount: 0,
    });
  }, []);

  // Stable retry scheduler using refs to avoid circular dependencies
  scheduleRetryRef.current = (isInitial: boolean) => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      setState(prevState => {
        if (prevState.retryCount >= maxRetries) {
          return {
            ...prevState,
            error: 'Failed to load comments after multiple attempts. Please try again later.',
            loading: false,
          };
        }

        return {
          ...prevState,
          retryCount: prevState.retryCount + 1,
          loading: true,
          error: null,
        };
      });

      // Call the latest loadMessages via ref
      loadMessagesRef.current?.(isInitial);
    }, 5000);
  };

  const loadMessages = useCallback(async (isInitial = false) => {
    // Check if we should proceed with loading
    setState(prevState => {
      if (prevState.loading || prevState.endReached) return prevState;
      return { ...prevState, loading: true, error: null };
    });

    try {
      const currentToken = tokenRef.current;
      const response = await QualiChatService.getTokenMessages(
        currentToken.name,
        currentToken.address,
        { from: fromRef.current, limit: 20 }
      );

      const textMessages = (response?.data || [])
        .filter((m) => m?.content?.msgtype === 'm.text');

      setState(currentState => ({
        ...currentState,
        messages: isInitial ? textMessages : [...currentState.messages, ...textMessages],
        from: response?.end || undefined,
        endReached: !response?.data?.length || !response?.end,
        loading: false,
        retryCount: 0, // Reset retry count on success
      }));

      // Update the ref with the new from value
      fromRef.current = response?.end || undefined;
    } catch (error: any) {
      if (error?.status === 404) {
        setState(currentState => ({
          ...currentState,
          loading: false,
          endReached: true,
          retryCount: 0,
        }));
      } else {
        setState(currentState => {
          const shouldRetry = currentState.retryCount < maxRetries;

          if (shouldRetry) {
            // Schedule retry
            scheduleRetryRef.current?.(isInitial);
            return {
              ...currentState,
              loading: false,
              error: `Failed to load messages. Retrying in 5 seconds... (${currentState.retryCount + 1}/${maxRetries})`,
            };
          } else {
            // Max retries reached
            return {
              ...currentState,
              loading: false,
              error: 'Unable to load messages after multiple attempts. Please try again later.',
            };
          }
        });
      }
    }
  }, []);

  // Expose latest loadMessages to retry scheduler via ref
  loadMessagesRef.current = loadMessages;

  const handleRetry = useCallback(() => {
    resetChat();
    loadMessages(true);
  }, [resetChat, loadMessages]);

  // Reset chat when token changes (only if messages are shown)
  useEffect(() => {
    if (showMessages) resetChat();
  }, [token?.address, token?.name, showMessages, resetChat]);

  // Load initial messages (only if messages are shown)
  useEffect(() => {
    if (showMessages) loadMessages(true);
  }, [token?.address, token?.name, showMessages, loadMessages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const hasMessages = state.messages.length > 0;
  const showEmptyState = !state.loading && !state.error && state.endReached && !hasMessages;

  // showCTA & showMessages already defined above

  return (
    <div className="grid gap-2">
      {showCTA && <AddCommentCTA token={token} />}

      {showMessages && state.error && (
        <ErrorDisplay error={state.error} onRetry={handleRetry} />
      )}

      {showMessages && !state.error && (
        <div className="grid gap-2">
          {state.messages.map((message, index) => (
            <MessageItem
              key={`${message.sender}-${message.timestamp}-${index}`}
              message={message}
              index={index}
            />
          ))}

          {state.loading && (
            <>
              {Array.from({ length: 3 }, (_, i) => (
                <MessageSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}
        </div>
      )}

      {showMessages && (
      <div className="text-center mt-1.5">
        {!state.endReached && !state.error && (
          <AeButton
            onClick={() => loadMessages(false)}
            disabled={state.loading}
            loading={state.loading}
            variant="ghost"
            size="medium"
            className="min-w-24"
          >
            {state.loading ? 'Loading…' : 'Load more'}
          </AeButton>
        )}

        {showEmptyState && <EmptyState />}
      </div>
      )}
    </div>
  );
}


