import { test, expect, type Page } from '@playwright/test';
import { startNostrRelay } from './helpers/nostr-relay';
import { forceStandalone } from './helpers/display-mode';

const PASSPHRASE = 'correct horse battery staple extra';
const ROOM = 'ct_browser_room';
let relay: Awaited<ReturnType<typeof startNostrRelay>>;
let roomConfigured = true;
const accounts = new Map<string, string>();
const members = new Set<string>();

async function prepare(page: Page) {
  page.setDefaultTimeout(20_000);
  await forceStandalone(page);
  await page.addInitScript(() => localStorage.setItem('onboarding:skip', 'true'));
  await page.route('**/api/rooms/config', (route) => route.fulfill({
    json: {
      relay_url: roomConfigured ? relay.url : '', admin_pubkey: '',
    },
  }));
  await page.route(/\/api\/rooms\?/, (route) => {
    const address = new URL(route.request().url()).searchParams.get('address')!;
    const pubkey = accounts.get(address);
    return route.fulfill({
      json: {
        items: pubkey ? [{
          sale_address: ROOM,
          token_address: 'ct_browser_token',
          symbol: 'TEST',
          is_private: true,
          is_community: true,
          min_token_threshold: '1',
          role: 'member',
          relay_state: members.has(pubkey) ? 'added' : 'removed',
          member_pubkey: pubkey,
          readable: members.has(pubkey),
        }] : [],
      },
    });
  });
  await page.route(/\/api\/accounts\/ak_/, (route) => route.fulfill({
    json: {
      links: { nostr: 'linked-test-account' },
    },
  }));
  // Never send a blockchain transaction from this test.
  await page.route('**/v3/transactions', (route) => (
    route.request().method() === 'POST' ? route.abort() : route.continue()
  ));
}

async function unlock(page: Page) {
  await page.getByRole('button', { name: 'Unlock chat', exact: true }).click();
  await page.locator('input[type="password"]').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Approve & unlock' }).click();
  await expect(page.getByRole('button', { name: 'Approve & unlock' })).toBeHidden({ timeout: 30_000 });
}

/** Create a real encrypted wallet through the UI, then use its chat unlock prompt. */
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i }).filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /^Create a wallet/ }).click();
  await page.getByText('Write down your recovery phrase').waitFor();
  const tiles = await page.locator('div.grid.grid-cols-3 > div').allInnerTexts();
  const words = tiles.map((text) => text.replace(/^\s*\d+\s*/, '').trim());
  await page.getByRole('button', { name: "I've written them down" }).click();
  for (let n = 0; n < 2; n += 1) {
    // eslint-disable-next-line no-await-in-loop
    const label = await page.locator(`label[for="vw${n}"]`).innerText();
    // eslint-disable-next-line no-await-in-loop
    await page.locator(`#vw${n}`).fill(words[Number(label.match(/\d+/)?.[0]) - 1]);
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('input[type="password"]').nth(0).fill(PASSPHRASE);
  await page.locator('input[type="password"]').nth(1).fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Create wallet' }).click();
  await page.getByText('Unlock with this device').waitFor({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#recovery-saved').check();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  const address = (await page.locator('p.font-mono.text-emerald-400').innerText()).trim();
  await page.getByRole('button', { name: 'Open wallet' }).click();
  await page.evaluate((active) => {
    localStorage.setItem('account:activeAccount', JSON.stringify(active));
  }, address);
  await page.goto('/chat');
  await unlock(page);
  // Read only the public identity; all keys were derived by the real wallet flow.
  const pubkey: string = await page.evaluate(async () => {
    const modulePath = '/src/features/chat/session/room-session.ts';
    const { roomKeySession } = await import(modulePath);
    return roomKeySession.keys.publicKey;
  });
  accounts.set(address, pubkey);
  return { address, pubkey };
}
async function openChat(page: Page, path: string) {
  await page.goto(path);
  await unlock(page);
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
}
async function send(page: Page, text: string) {
  await page.getByLabel('Message', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
}

test.beforeAll(async () => { relay = await startNostrRelay(18777); });
test.afterAll(async () => { await relay?.close(); });

test('two wallets exchange DMs and private-room messages; history, revocation and config failures', async ({ browser }) => {
  const contextA = await browser.newContext({ baseURL: 'http://localhost:5186' });
  const contextB = await browser.newContext({ baseURL: 'http://localhost:5186' });
  const alice = await contextA.newPage();
  const bob = await contextB.newPage();
  try {
    await prepare(alice);
    await prepare(bob);
    const a = await onboard(alice);
    const b = await onboard(bob);
    expect(a.pubkey).not.toBe(b.pubkey);
    await openChat(alice, `/chat/dm/${b.pubkey}`);
    await openChat(bob, `/chat/dm/${a.pubkey}`);
    await send(alice, '  Alice to Bob browser DM  ');
    await expect(bob.getByText('Alice to Bob browser DM', { exact: true })).toHaveCount(1);
    await send(bob, 'Bob to Alice browser DM');
    await expect(alice.getByText('Bob to Alice browser DM', { exact: true })).toHaveCount(1);
    await openChat(bob, `/chat/dm/${a.pubkey}`);
    await expect(bob.getByText('Alice to Bob browser DM', { exact: true })).toHaveCount(1);

    members.add(a.pubkey);
    members.add(b.pubkey);
    relay.rooms.set(ROOM, { private: true, members });
    await openChat(alice, `/chat/${ROOM}`);
    await openChat(bob, `/chat/${ROOM}`);
    await send(alice, 'Alice private room message');
    await expect(bob.getByText('Alice private room message', { exact: true })).toHaveCount(1);
    await expect(alice.getByText('Alice private room message', { exact: true })).toHaveCount(1);
    await send(bob, 'Bob private room reply');
    await expect(alice.getByText('Bob private room reply', { exact: true })).toHaveCount(1);
    await openChat(bob, `/chat/${ROOM}`);
    await expect(bob.getByText('Alice private room message', { exact: true })).toHaveCount(1);

    members.delete(b.pubkey);
    await bob.reload();
    await expect(bob.getByLabel('Message', { exact: true })).toHaveCount(0);
    await expect(bob.getByText('Alice private room message', { exact: true })).toHaveCount(0);

    roomConfigured = false;
    await alice.reload();
    await expect(alice.getByText('Token-gated chat is not configured on this server. Please try again later.'))
      .toBeVisible({ timeout: 20_000 });
    await expect(alice.getByRole('button', { name: 'Retry connection' })).toBeVisible();
    expect(relay.invalidRequests).toEqual([]);
  } finally {
    await contextA.close().catch(() => {});
    await contextB.close().catch(() => {});
  }
});
