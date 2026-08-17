/**
 * Rendered by the chat entry views when no relay is configured for this
 * deployment (`NOSTR_RELAY_URLS` unset — chat ships "dark"). A plain explanation,
 * never a spinner or a crash: with no relay there is no transport to start.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Radio } from 'lucide-react';

const ChatUnavailableNotice = () => (
  <div className="mx-auto w-full max-w-2xl px-4 py-6">
    <header className="mb-4 flex items-center gap-2">
      <Link to="/" aria-label="Back" className="text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <Radio className="h-5 w-5 text-primary" aria-hidden />
      <h1 className="text-xl font-semibold text-foreground">Chat</h1>
    </header>

    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <Radio className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Chat is unavailable — no relay is configured for this deployment.
      </p>
    </div>
  </div>
);

export default ChatUnavailableNotice;
