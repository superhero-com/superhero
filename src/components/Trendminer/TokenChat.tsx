import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QualiChatService, type QualiMessage } from '../../libs/QualiChatService';
import AeButton from '../AeButton';

type Props = {
  token: {
    name: string;
    address: string;
  };
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
    <div className="text-sm text-white/60 mb-2">No messages yet</div>
    <div className="text-xs text-white/40">Be the first to share your thoughts!</div>
  </div>
);

// Add chat CTAs component
const AddCommentCTA = ({ token }: { token: { name: string; address: string } }) => {
  const encodedName = encodeURIComponent(token.name);
  const encodedAddress = encodeURIComponent(token.address);
  const qualiPublicUrl = `https://app.quali.chat/#/room/#PUB_${encodedName}_${encodedAddress}_AETERNITY:quali.chat`;
  const qualiPrivateUrl = `https://app.quali.chat/#/room/#PRIV_${encodedName}_${encodedAddress}_AETERNITY:quali.chat`;

  return (
    <div className="border border-white/15 rounded-2xl p-4 md:p-5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-[10px] text-center">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3 text-left">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] flex items-center justify-center shadow-[0_6px_18px_rgba(78,205,196,0.28)]">
          <span className="text-white text-base">💬</span>
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold text-[15px] mb-1 tracking-wide">Join the trend holders’ exclusive chat rooms</h4>
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-white/70">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">🌐 Public: read for all, post for holders</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">🔒 Private: holders only</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2.5 flex-wrap">
        <a
          href={qualiPublicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 no-underline text-white bg-white/10 border border-white/20 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:bg-white/20 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-white/30 active:translate-y-0 no-gradient-text"
          title="Open the public chat on Quali.chat"
        >
          🌐 Public chat
        </a>
        <a
          href={qualiPrivateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 no-underline text-white bg-white/10 border border-white/20 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:bg-white/20 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-white/30 active:translate-y-0 no-gradient-text"
          title="Open the private chat on Quali.chat (holders only)"
        >
          🔒 Private chat
        </a>
      </div>
      <div className="mt-2 text-xs opacity-70 text-white/70">
        Service provided by{' '}
        <a
          href="https://quali.chat"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4ecdc4] hover:text-white transition-colors underline"
        >
          Quali.chat
        </a>
      </div>
    </div>
  );
};

export default function TokenChat({ token }: Props) {
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

  const scheduleRetry = useCallback((isInitial: boolean) => {
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

      loadMessages(isInitial);
    }, 5000);
  }, [maxRetries]);

  const loadMessages = useCallback(async (isInitial = false) => {
    // Check if we should proceed with loading
    setState(prevState => {
      if (prevState.loading || prevState.endReached) return prevState;
      return { ...prevState, loading: true, error: null };
    });

    try {
      const response = await QualiChatService.getTokenMessages(
        token.name,
        token.address,
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
            scheduleRetry(isInitial);
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
  }, [token.name, token.address, maxRetries, scheduleRetry]);

  const handleRetry = useCallback(() => {
    resetChat();
    loadMessages(true);
  }, [resetChat, loadMessages]);

  // Reset chat when token changes
  useEffect(() => {
    resetChat();
  }, [token?.address, token?.name]);

  // Load initial messages
  useEffect(() => {
    loadMessages(true);
  }, [token?.address, token?.name]);

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

  return (
    <div className="grid gap-2">
      <AddCommentCTA token={token} />

      {state.error && (
        <ErrorDisplay error={state.error} onRetry={handleRetry} />
      )}

      {!state.error && (
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
    </div>
  );
}


