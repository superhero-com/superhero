/**
 * Nostr relay settings (ported from the app's
 * `app/(shared)/settings/relays.tsx`). Lists the configured relays with per-relay
 * read/write toggles, a reachability test, and add/remove — writing through the
 * persisted `relaysAtom`, which the chat provider pushes into the running client.
 *
 * The mobile screen leaned on `Alert.alert` and a React Native `Switch`; neither
 * exists on the web. Confirmation and status are inline instead, and read/write
 * are Checkboxes (the repo has no Switch primitive).
 */
import { useState } from 'react';
import { useAtom } from 'jotai';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Plus, Radio, RefreshCw, Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

import { relaysAtom } from '../domains/ui.state';
import {
  addRelay, removeRelay, setRelayFlag, validateRelayUrl, testRelayConnection, getRelayDescription,
} from '../nostr/relays';
import { isAllowedRelayOrigin } from '../core/relay-config';

type TestState = { url: string; ok: boolean; message: string } | null;

const RelaySettingsView = () => {
  const [relays, setRelays] = useAtom(relaysAtom);

  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newRead, setNewRead] = useState(true);
  const [newWrite, setNewWrite] = useState(true);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [testingUrl, setTestingUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestState>(null);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

  const relayList = Object.entries(relays).map(([url, config]) => ({ url, ...config }));

  const resetAddForm = () => {
    setNewUrl('');
    setNewRead(true);
    setNewWrite(true);
    setAddError(null);
  };

  const handleAdd = async () => {
    const url = newUrl.trim();
    if (!url) {
      setAddError('Enter a relay URL.');
      return;
    }
    if (!validateRelayUrl(url)) {
      setAddError('Enter a valid secure WebSocket URL (wss://…).');
      return;
    }
    // A relay whose origin is not in the deploy-time allowlist would be blocked by
    // the site's CSP at connect time — reject it here, with the reason, not silently.
    if (!isAllowedRelayOrigin(url)) {
      setAddError('This relay is not permitted by the site configuration.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const test = await testRelayConnection(url);
      // A failed reachability check is a warning, not a hard block — the relay
      // may simply be offline right now — but surface it before we add.
      setRelays(addRelay(relays, url, newRead, newWrite));
      setAddOpen(false);
      resetAddForm();
      setTestResult(
        test.success
          ? { url, ok: true, message: 'Added and reachable.' }
          : { url, ok: false, message: `Added, but could not connect (${test.error ?? 'unreachable'}).` },
      );
    } finally {
      setAdding(false);
    }
  };

  const handleTest = async (url: string) => {
    setTestingUrl(url);
    setTestResult(null);
    try {
      const result = await testRelayConnection(url);
      setTestResult(
        result.success
          ? { url, ok: true, message: 'Reachable.' }
          : { url, ok: false, message: result.error ?? 'Connection failed.' },
      );
    } finally {
      setTestingUrl(null);
    }
  };

  const handleRemove = (url: string) => {
    setRelays(removeRelay(relays, url));
    setConfirmingRemove(null);
    if (testResult?.url === url) setTestResult(null);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-center gap-2">
        <Link to="/chat" aria-label="Back to chat" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Radio className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">Nostr relays</h1>
      </header>

      <p className="mb-4 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
        Relays store and forward your Nostr messages. Choose which relays to read from and write to.
      </p>

      {relayList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Radio className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No relays configured. Add one below to start reading and writing.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {relayList.map((relay) => (
            <li key={relay.url} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {relay.url.replace(/^wss:\/\//, '')}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{getRelayDescription(relay.url)}</p>
                  {testResult?.url === relay.url && (
                    <p className={`mt-1 text-xs ${testResult.ok ? 'text-emerald-500' : 'text-error'}`}>
                      {testResult.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(relay.url)}
                    disabled={testingUrl === relay.url}
                    aria-label={`Test ${relay.url}`}
                  >
                    {testingUrl === relay.url
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingRemove(relay.url)}
                    aria-label={`Remove ${relay.url}`}
                  >
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-6">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    aria-label={`Read from ${relay.url}`}
                    checked={relay.read}
                    onCheckedChange={(value) => setRelays(
                      setRelayFlag(relays, relay.url, 'read', value === true),
                    )}
                  />
                  Read
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    aria-label={`Write to ${relay.url}`}
                    checked={relay.write}
                    onCheckedChange={(value) => setRelays(
                      setRelayFlag(relays, relay.url, 'write', value === true),
                    )}
                  />
                  Write
                </span>
              </div>

              {confirmingRemove === relay.url && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-error/40 bg-error/5 p-2">
                  <span className="text-xs text-foreground">Remove this relay?</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingRemove(null)}>Cancel</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemove(relay.url)}>Remove</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Button onClick={() => { resetAddForm(); setAddOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add relay
        </Button>
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Nostr relay</DialogTitle>
            <DialogDescription>Enter a secure relay WebSocket URL (wss://…).</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <Input
              placeholder="wss://relay.example.com"
              value={newUrl}
              onChange={(event) => setNewUrl(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  aria-label="Read from relay"
                  checked={newRead}
                  onCheckedChange={(value) => setNewRead(value === true)}
                />
                Read from relay
              </span>
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  aria-label="Write to relay"
                  checked={newWrite}
                  onCheckedChange={(value) => setNewWrite(value === true)}
                />
                Write to relay
              </span>
            </div>
            {addError && <p className="text-xs text-error">{addError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !newUrl.trim()}>
              {adding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {adding ? 'Adding…' : 'Add relay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RelaySettingsView;
