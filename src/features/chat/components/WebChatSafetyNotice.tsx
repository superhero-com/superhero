import { ShieldCheck, Smartphone } from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/superhero-web3-communities/id6758045846';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.superhero.apps';

/** Browser access is supported; explain its extension risk without hiding the inbox. */
export const WebChatSafetyNotice = () => (
  <aside className="border-b border-border px-4 py-2" aria-label="Chat security recommendation">
    <details className="group text-xs text-muted-foreground">
      <summary className="flex cursor-pointer items-center gap-2 py-1 text-foreground focus-visible:outline-2 focus-visible:outline-primary">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="flex-1">Chat works on web. The mobile app offers extra protection.</span>
        <span className="text-primary group-open:hidden">Learn more</span>
      </summary>
      <div className="pb-2 pl-6 text-sm leading-relaxed">
        <p className="mt-2">
          Direct messages are end-to-end encrypted. Your chat key stays in this tab&apos;s
          memory and locks after 30 minutes idle. Browser extensions with access to
          this page can read an open conversation; the mobile app is sandboxed.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            <Smartphone className="h-4 w-4" aria-hidden /> iOS app
          </a>
          <a className="text-primary underline-offset-2 hover:underline" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
            Android app
          </a>
        </div>
      </div>
    </details>
  </aside>
);

export default WebChatSafetyNotice;
