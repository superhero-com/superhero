/**
 * In-memory stand-in for `BroadcastChannel`, installed with `vi.stubGlobal`. A message reaches
 * every other open channel of the same name, as it would reach the other tabs of one origin, and
 * is delivered on a microtask so a test can flush it together with its fake timers.
 */
export class FakeBroadcastChannel {
  static readonly openChannels = new Set<FakeBroadcastChannel>();

  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(readonly name: string) {
    FakeBroadcastChannel.openChannels.add(this);
  }

  static reset() {
    FakeBroadcastChannel.openChannels.clear();
  }

  postMessage(data: unknown) {
    FakeBroadcastChannel.openChannels.forEach((channel) => {
      if (channel === this || channel.name !== this.name) return;
      queueMicrotask(() => channel.onmessage?.({ data } as MessageEvent));
    });
  }

  close() {
    FakeBroadcastChannel.openChannels.delete(this);
  }
}

/** Records everything posted on `name` by anyone else, the way another tab would hear it. */
export const listenOn = (name: string) => {
  const received: unknown[] = [];
  const channel = new FakeBroadcastChannel(name);
  channel.onmessage = (event) => received.push(event.data);
  return received;
};
